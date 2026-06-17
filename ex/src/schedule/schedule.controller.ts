import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';
import { SyncProducer } from '../sync/sync.producer';
import { SheetClientService } from '../sheets/sheet-client.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { Contribution } from './seed.data';
import { daysInMonth, isValidMonth, monthDays, monthRange, nextMonth } from './dates';
import { gridTab } from '../sheets/sheets.constants';
import {
  loadAggContext,
  orderedTotals,
  replaceMonthAssignments,
} from './grid-ops';

@Controller('schedule')
export class ScheduleController {
  constructor(
    private service: ScheduleService,
    private prisma: PrismaService,
    private producer: SyncProducer,
    private client: SheetClientService,
    private writer: SheetWriterService,
  ) {}

  // ── 그리드 / 설정 ────────────────────────────────────────────────────
  @Get('grid')
  async grid(@Query('month') month?: string) {
    const m = month || (await this.service.config()).activeMonth;
    return this.service.getGrid(m);
  }

  @Get('config')
  config() {
    return this.service.config();
  }

  @Patch('config')
  async updateConfig(@Body() dto: Partial<{ orgName: string; activeMonth: string }>) {
    return this.prisma.scheduleConfig.update({ where: { id: 1 }, data: dto });
  }

  // ── 근무형태 세팅 ────────────────────────────────────────────────────
  @Get('shift-types')
  shiftTypes() {
    return this.service.shiftTypes();
  }

  @Put('shift-types')
  async upsertShiftType(
    @Body()
    dto: {
      code: string;
      label: string;
      bgColor?: string;
      fgColor?: string;
      sortOrder?: number;
      contributions?: Contribution[];
    },
  ) {
    const t = await this.service.upsertShiftType(dto);
    await this.producer.enqueueSettingsToSheet(); // 웹 편집 → 설정 탭 반영
    return t;
  }

  // 코드에 '/' 가 들어가므로(M/, /, /M/Q …) path param 대신 query 로 받는다
  @Delete('shift-types')
  async deleteShiftType(@Query('code') code: string) {
    const t = await this.service.deleteShiftType(code);
    await this.producer.enqueueSettingsToSheet();
    return t;
  }

  /** 설정 DB→시트 강제 푸시 (설정 탭 초기화/복구용) */
  @Post('settings/push')
  async pushSettings() {
    await this.producer.enqueueSettingsToSheet();
    return { ok: true };
  }

  /** 설정 시트→DB 강제 풀 (수동 재동기화) */
  @Post('settings/pull')
  async pullSettings() {
    await this.producer.enqueueSheetToSettings();
    return { ok: true };
  }

  @Get('buckets')
  buckets() {
    return this.service.buckets();
  }

  // ── 직원 ─────────────────────────────────────────────────────────────
  @Get('employees')
  employees() {
    return this.service.listEmployees();
  }

  @Post('employees')
  async createEmployee(
    @Body() dto: { name: string; rank?: string; dept?: string; sortOrder?: number },
  ) {
    const emp = await this.service.createEmployee(dto);
    const { activeMonth } = await this.service.config();
    await this.producer.enqueueDbToSheet(emp.id, activeMonth); // 활성월 탭에 새 행
    return emp;
  }

  @Patch('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: Partial<{ name: string; rank: string; dept: string; sortOrder: number }>,
  ) {
    const emp = await this.service.updateEmployee(id, dto);
    const { activeMonth } = await this.service.config();
    await this.producer.enqueueDbToSheet(id, activeMonth);
    return emp;
  }

  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string) {
    return this.service.deleteEmployee(id);
  }

  // ── 셀(배정) ─────────────────────────────────────────────────────────
  @Put('cell')
  async setCell(
    @Body() dto: { employeeId: string; date: string; code: string },
  ) {
    const totals = await this.service.setCell(dto.employeeId, dto.date, dto.code, 'service');
    const month = dto.date.slice(0, 7); // 날짜의 월 탭에 반영
    await this.producer.enqueueDbToSheet(dto.employeeId, month);
    return { ok: true, employeeId: dto.employeeId, totals };
  }

  // ── 재동기화 (해당 월 탭 기준) ─────────────────────────────────────────
  // 직원은 전역이라 삭제하지 않는다. 이 달 탭에서 빠진 직원의 "이 달 배정"만 정리.
  @Post('reconcile')
  async reconcile(@Query('month') monthQ?: string) {
    const cfg = await this.service.config();
    const month = monthQ || cfg.activeMonth;
    const tab = gridTab(month);
    const dayCount = daysInMonth(month);
    const rows = await this.client.readGrid(tab, dayCount);
    const { tMap, bucketKeys } = await loadAggContext(this.prisma);

    const seen: string[] = [];
    for (const row of rows) {
      if (!row.name) continue;

      const emp = row.empId
        ? await this.prisma.employee.upsert({
            where: { id: row.empId },
            create: { id: row.empId, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
            update: { name: row.name, rank: row.rank || null, syncStatus: 'synced' },
          })
        : await this.prisma.employee.create({
            data: { name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
          });

      if (!row.empId) await this.writer.writeId(tab, row.rowIndex, emp.id);
      await replaceMonthAssignments(this.prisma, emp.id, month, row.codes, 'sheet');

      const totals = orderedTotals(row.codes, tMap, bucketKeys);
      await this.writer.pushTotals(tab, row.rowIndex, dayCount, totals);
      seen.push(emp.id);
    }

    // 탭에서 빠진 직원의 이 달 배정만 삭제 (직원 자체는 보존 — 다른 달에 있을 수 있음)
    const { gte, lt } = monthRange(month);
    const cleared = seen.length
      ? await this.prisma.assignment.deleteMany({
          where: { date: { gte, lt }, employeeId: { notIn: seen } },
        })
      : { count: 0 };

    return { month, reconciled: seen.length, clearedAssignments: cleared.count };
  }

  // ── 다음 달 준비 (월별 탭 자동 생성 + 명부 채우고 활성월 전환) ──────────
  @Post('months/roll')
  async rollMonth(@Body() dto: { month?: string } = {}) {
    const cfg = await this.service.config();
    const to = dto.month || nextMonth(cfg.activeMonth);
    if (!isValidMonth(to)) throw new BadRequestException('month must be YYYY-MM');

    const tab = gridTab(to);
    const existed = await this.client.ensureTab(tab); // 없으면 생성

    const [employees, buckets] = await Promise.all([
      this.service.listEmployees(),
      this.service.buckets(),
    ]);
    const days = monthDays(to);

    const header = [
      'empId',
      '성명',
      '직급',
      ...days.map((d) => d.day),
      ...buckets.map((b) => b.label),
    ];
    const blankDays = days.map(() => '');
    const blankTotals = buckets.map(() => '');
    const rows = employees.map((e) => [
      e.id,
      e.name,
      e.rank || '',
      ...blankDays,
      ...blankTotals,
    ]);

    // A1=월(텍스트, RAW 라 날짜 변환 안 됨), 2행 헤더, 3행~ 명부(코드/합계 공란)
    await this.client.writeRange(tab, 'A1', [[to]]);
    await this.client.writeRange(tab, 'A2', [header, ...rows]);

    await this.prisma.scheduleConfig.update({
      where: { id: 1 },
      data: { activeMonth: to },
    });

    return {
      from: cfg.activeMonth,
      to,
      tab,
      created: !existed,
      employees: employees.length,
    };
  }
}
