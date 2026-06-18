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
  UseGuards,
} from '@nestjs/common';
import { Org } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';
import { SyncProducer } from '../sync/sync.producer';
import { SheetClientService } from '../sheets/sheet-client.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { OrgGuard } from '../org/org.guard';
import { OrgId, CurrentOrg } from '../org/org-id.decorator';
import { OrgService } from '../org/org.service';
import { toPublicOrg } from '../org/org.types';
import { Contribution } from './seed.data';
import { daysInMonth, isValidMonth, monthDays, monthRange, nextMonth } from './dates';
import { gridTab } from '../sheets/sheets.constants';
import {
  loadAggContext,
  orderedTotals,
  replaceMonthAssignments,
} from './grid-ops';

@Controller('schedule')
@UseGuards(OrgGuard) // 모든 핸들러에 테넌트 컨텍스트(req.org/orgId) 부착
export class ScheduleController {
  constructor(
    private service: ScheduleService,
    private prisma: PrismaService,
    private producer: SyncProducer,
    private client: SheetClientService,
    private writer: SheetWriterService,
    private orgService: OrgService,
  ) {}

  // ── 그리드 / 설정 ────────────────────────────────────────────────────
  @Get('grid')
  async grid(@CurrentOrg() org: Org, @Query('month') month?: string) {
    return this.service.getGrid(org.id, month || org.activeMonth);
  }

  @Get('config')
  config(@CurrentOrg() org: Org) {
    return toPublicOrg(org);
  }

  @Patch('config')
  async updateConfig(
    @OrgId() orgId: string,
    @Body() dto: Partial<{ name: string; orgName: string; activeMonth: string }>,
  ) {
    const data: { name?: string; activeMonth?: string } = {};
    if (dto.name ?? dto.orgName) data.name = dto.name ?? dto.orgName;
    if (dto.activeMonth) data.activeMonth = dto.activeMonth;
    return toPublicOrg(await this.orgService.update(orgId, data));
  }

  // ── 근무형태 세팅 ────────────────────────────────────────────────────
  @Get('shift-types')
  shiftTypes(@OrgId() orgId: string) {
    return this.service.shiftTypes(orgId);
  }

  @Put('shift-types')
  async upsertShiftType(
    @OrgId() orgId: string,
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
    const t = await this.service.upsertShiftType(orgId, dto);
    await this.producer.enqueueSettingsToSheet(orgId); // 웹 편집 → 설정 탭 반영
    return t;
  }

  // 코드에 '/' 가 들어가므로(M/, /, /M/Q …) path param 대신 query 로 받는다
  @Delete('shift-types')
  async deleteShiftType(@OrgId() orgId: string, @Query('code') code: string) {
    const t = await this.service.deleteShiftType(orgId, code);
    await this.producer.enqueueSettingsToSheet(orgId);
    return t;
  }

  /** 설정 DB→시트 강제 푸시 (설정 탭 초기화/복구용) */
  @Post('settings/push')
  async pushSettings(@OrgId() orgId: string) {
    await this.producer.enqueueSettingsToSheet(orgId);
    return { ok: true };
  }

  /** 설정 시트→DB 강제 풀 (수동 재동기화) */
  @Post('settings/pull')
  async pullSettings(@OrgId() orgId: string) {
    await this.producer.enqueueSheetToSettings(orgId);
    return { ok: true };
  }

  @Get('buckets')
  buckets(@OrgId() orgId: string) {
    return this.service.buckets(orgId);
  }

  // ── 직원 ─────────────────────────────────────────────────────────────
  @Get('employees')
  employees(@OrgId() orgId: string) {
    return this.service.listEmployees(orgId);
  }

  @Post('employees')
  async createEmployee(
    @CurrentOrg() org: Org,
    @Body() dto: { name: string; rank?: string; dept?: string; sortOrder?: number },
  ) {
    const emp = await this.service.createEmployee(org.id, dto);
    await this.producer.enqueueDbToSheet(org.id, emp.id, org.activeMonth); // 활성월 탭에 새 행
    return emp;
  }

  @Patch('employees/:id')
  async updateEmployee(
    @CurrentOrg() org: Org,
    @Param('id') id: string,
    @Body() dto: Partial<{ name: string; rank: string; dept: string; sortOrder: number }>,
  ) {
    const emp = await this.service.updateEmployee(org.id, id, dto);
    await this.producer.enqueueDbToSheet(org.id, id, org.activeMonth);
    return emp;
  }

  @Delete('employees/:id')
  deleteEmployee(@OrgId() orgId: string, @Param('id') id: string) {
    return this.service.deleteEmployee(orgId, id);
  }

  // ── 셀(배정) ─────────────────────────────────────────────────────────
  @Put('cell')
  async setCell(
    @OrgId() orgId: string,
    @Body() dto: { employeeId: string; date: string; code: string },
  ) {
    const totals = await this.service.setCell(orgId, dto.employeeId, dto.date, dto.code, 'service');
    const month = dto.date.slice(0, 7); // 날짜의 월 탭에 반영
    await this.producer.enqueueDbToSheet(orgId, dto.employeeId, month);
    return { ok: true, employeeId: dto.employeeId, totals };
  }

  // ── 재동기화 (해당 월 탭 기준) ─────────────────────────────────────────
  // 직원은 조직 내 전역이라 삭제하지 않는다. 이 달 탭에서 빠진 직원의 "이 달 배정"만 정리.
  @Post('reconcile')
  async reconcile(@CurrentOrg() org: Org, @Query('month') monthQ?: string) {
    const month = monthQ || org.activeMonth;
    const tab = gridTab(org.gridTabPrefix, month);
    const dayCount = daysInMonth(month);
    const rows = await this.client.readGrid(org.sheetId, tab, dayCount);
    const { tMap, bucketKeys } = await loadAggContext(this.prisma, org.id);

    const seen: string[] = [];
    for (const row of rows) {
      if (!row.name) continue;

      const emp = row.empId
        ? await this.prisma.employee.upsert({
            where: { id: row.empId },
            create: { id: row.empId, orgId: org.id, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
            update: { name: row.name, rank: row.rank || null, syncStatus: 'synced' },
          })
        : await this.prisma.employee.create({
            data: { orgId: org.id, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
          });

      if (!row.empId) await this.writer.writeId(org.sheetId, tab, row.rowIndex, emp.id);
      await replaceMonthAssignments(this.prisma, org.id, emp.id, month, row.codes, 'sheet');

      const totals = orderedTotals(row.codes, tMap, bucketKeys);
      await this.writer.pushTotals(org.sheetId, tab, row.rowIndex, dayCount, totals);
      seen.push(emp.id);
    }

    // 탭에서 빠진 직원의 이 달 배정만 삭제 (이 조직 안에서만 — 교차 테넌트 삭제 금지).
    const { gte, lt } = monthRange(month);
    const cleared = seen.length
      ? await this.prisma.assignment.deleteMany({
          where: { orgId: org.id, date: { gte, lt }, employeeId: { notIn: seen } },
        })
      : { count: 0 };

    return { month, reconciled: seen.length, clearedAssignments: cleared.count };
  }

  // ── 다음 달 준비 (월별 탭 자동 생성 + 명부 채우고 활성월 전환) ──────────
  @Post('months/roll')
  async rollMonth(@CurrentOrg() org: Org, @Body() dto: { month?: string } = {}) {
    const to = dto.month || nextMonth(org.activeMonth);
    if (!isValidMonth(to)) throw new BadRequestException('month must be YYYY-MM');

    const tab = gridTab(org.gridTabPrefix, to);
    const existed = await this.client.ensureTab(org.sheetId, tab); // 없으면 생성

    const [employees, buckets] = await Promise.all([
      this.service.listEmployees(org.id),
      this.service.buckets(org.id),
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
    await this.client.writeRange(org.sheetId, tab, 'A1', [[to]]);
    await this.client.writeRange(org.sheetId, tab, 'A2', [header, ...rows]);

    await this.orgService.setActiveMonth(org.id, to);

    return {
      from: org.activeMonth,
      to,
      tab,
      created: !existed,
      employees: employees.length,
    };
  }
}
