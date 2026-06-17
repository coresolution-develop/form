import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeTotals, ShiftTypeLite } from './aggregation';
import { Contribution } from './seed.data';
import {
  fromIso,
  isValidMonth,
  monthDays,
  monthRange,
  toIso,
} from './dates';

export interface GridEmployee {
  id: string;
  name: string;
  rank: string | null;
  dept: string | null;
  cells: Record<string, string>; // iso → shift code
  totals: Record<string, number>; // bucket key → value
}

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async config() {
    return this.prisma.scheduleConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  async shiftTypes() {
    return this.prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async buckets() {
    return this.prisma.aggregateBucket.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /** code → contributions 맵 (집계용) */
  async typeMap(): Promise<Map<string, ShiftTypeLite>> {
    const types = await this.shiftTypes();
    return new Map(
      types.map((t) => [
        t.code,
        { code: t.code, contributions: (t.contributions ?? []) as unknown as Contribution[] },
      ]),
    );
  }

  /** 월간 그리드 전체 — 화면 한 장에 필요한 모든 것 */
  async getGrid(month: string) {
    if (!isValidMonth(month)) throw new BadRequestException('month must be YYYY-MM');

    const [cfg, buckets, shiftTypes, tMap] = await Promise.all([
      this.config(),
      this.buckets(),
      this.shiftTypes(),
      this.typeMap(),
    ]);
    const bucketKeys = buckets.map((b) => b.key);
    const { gte, lt } = monthRange(month);

    const employees = await this.prisma.employee.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { assignments: { where: { date: { gte, lt } } } },
    });

    const rows: GridEmployee[] = employees.map((e) => {
      const cells: Record<string, string> = {};
      for (const a of e.assignments) cells[toIso(a.date)] = a.shift;
      const totals = computeTotals(Object.values(cells), tMap, bucketKeys);
      return { id: e.id, name: e.name, rank: e.rank, dept: e.dept, cells, totals };
    });

    return {
      month,
      orgName: cfg.orgName,
      days: monthDays(month),
      buckets,
      shiftTypes,
      employees: rows,
    };
  }

  // ── 직원 ─────────────────────────────────────────────────────────────
  listEmployees() {
    return this.prisma.employee.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createEmployee(dto: {
    name: string;
    rank?: string;
    dept?: string;
    sortOrder?: number;
    source?: string;
  }) {
    if (!dto.name) throw new BadRequestException('name required');
    const max = await this.prisma.employee.aggregate({ _max: { sortOrder: true } });
    return this.prisma.employee.create({
      data: {
        name: dto.name,
        rank: dto.rank,
        dept: dto.dept,
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
        source: dto.source ?? 'service',
        syncStatus: 'synced',
      },
    });
  }

  updateEmployee(
    id: string,
    dto: Partial<{ name: string; rank: string; dept: string; sortOrder: number }>,
  ) {
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, syncStatus: 'synced' },
    });
  }

  deleteEmployee(id: string) {
    return this.prisma.employee.delete({ where: { id } });
  }

  // ── 셀(배정) ─────────────────────────────────────────────────────────
  /** 한 칸 설정. code 가 빈 값이면 배정 삭제. source 로 소유 구분. */
  async setCell(
    employeeId: string,
    iso: string,
    code: string,
    source: 'service' | 'sheet' = 'service',
  ) {
    const date = fromIso(iso);
    const shift = (code ?? '').trim();

    if (!shift) {
      await this.prisma.assignment.deleteMany({ where: { employeeId, date } });
    } else {
      await this.prisma.assignment.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: { employeeId, date, shift, source, syncStatus: 'synced' },
        update: { shift, source, syncStatus: 'synced' },
      });
    }
    return this.employeeTotals(employeeId);
  }

  /** 한 직원의 현재 활성월 합계 (응답 갱신용) */
  async employeeTotals(employeeId: string) {
    const cfg = await this.config();
    const { gte, lt } = monthRange(cfg.activeMonth);
    const [assignments, buckets, tMap] = await Promise.all([
      this.prisma.assignment.findMany({ where: { employeeId, date: { gte, lt } } }),
      this.buckets(),
      this.typeMap(),
    ]);
    return computeTotals(
      assignments.map((a) => a.shift),
      tMap,
      buckets.map((b) => b.key),
    );
  }

  // ── 근무형태(시프트) 세팅 ─────────────────────────────────────────────
  upsertShiftType(dto: {
    code: string;
    label: string;
    bgColor?: string;
    fgColor?: string;
    sortOrder?: number;
    contributions?: Contribution[];
  }) {
    if (!dto.code || !dto.label)
      throw new BadRequestException('code and label required');
    const data = {
      label: dto.label,
      bgColor: dto.bgColor ?? 'transparent',
      fgColor: dto.fgColor ?? '',
      sortOrder: dto.sortOrder ?? 0,
      contributions: (dto.contributions ?? []) as any,
    };
    return this.prisma.shiftType.upsert({
      where: { code: dto.code },
      create: { code: dto.code, ...data },
      update: data,
    });
  }

  deleteShiftType(code: string) {
    return this.prisma.shiftType.delete({ where: { code } });
  }
}
