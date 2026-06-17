import {
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
import { daysInMonth } from './dates';
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
  upsertShiftType(
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
    return this.service.upsertShiftType(dto);
  }

  @Delete('shift-types/:code')
  deleteShiftType(@Param('code') code: string) {
    return this.service.deleteShiftType(code);
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
    await this.producer.enqueueDbToSheet(emp.id); // 시트에 새 행 추가
    return emp;
  }

  @Patch('employees/:id')
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: Partial<{ name: string; rank: string; dept: string; sortOrder: number }>,
  ) {
    const emp = await this.service.updateEmployee(id, dto);
    await this.producer.enqueueDbToSheet(id);
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
    await this.producer.enqueueDbToSheet(dto.employeeId); // 웹→시트 반영
    return { ok: true, employeeId: dto.employeeId, totals };
  }

  // ── 재동기화 (시트 주도 삭제까지 반영) ─────────────────────────────────
  @Post('reconcile')
  async reconcile() {
    const cfg = await this.service.config();
    const month = cfg.activeMonth;
    const dayCount = daysInMonth(month);
    const rows = await this.client.readGrid(dayCount);
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

      if (!row.empId) await this.writer.writeId(row.rowIndex, emp.id);
      await replaceMonthAssignments(this.prisma, emp.id, month, row.codes, 'sheet');

      const totals = orderedTotals(row.codes, tMap, bucketKeys);
      await this.writer.pushTotals(row.rowIndex, dayCount, totals);
      seen.push(emp.id);
    }

    const deleted = await this.prisma.employee.deleteMany({
      where: seen.length ? { id: { notIn: seen } } : {},
    });

    return { reconciled: seen.length, deleted: deleted.count };
  }
}
