import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgService } from '../org/org.service';
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
  constructor(
    private prisma: PrismaService,
    private orgs: OrgService,
  ) {}

  /** 조직 설정 = Org 레코드 (구 ScheduleConfig 대체). */
  config(orgId: string) {
    return this.orgs.get(orgId);
  }

  shiftTypes(orgId: string) {
    return this.prisma.shiftType.findMany({
      where: { orgId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  buckets(orgId: string) {
    return this.prisma.aggregateBucket.findMany({
      where: { orgId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** code → contributions 맵 (집계용) */
  async typeMap(orgId: string): Promise<Map<string, ShiftTypeLite>> {
    const types = await this.shiftTypes(orgId);
    return new Map(
      types.map((t) => [
        t.code,
        { code: t.code, contributions: (t.contributions ?? []) as unknown as Contribution[] },
      ]),
    );
  }

  /** 월간 그리드 전체 — 화면 한 장에 필요한 모든 것 */
  async getGrid(orgId: string, month: string) {
    if (!isValidMonth(month)) throw new BadRequestException('month must be YYYY-MM');

    const [cfg, buckets, shiftTypes, tMap] = await Promise.all([
      this.config(orgId),
      this.buckets(orgId),
      this.shiftTypes(orgId),
      this.typeMap(orgId),
    ]);
    const bucketKeys = buckets.map((b) => b.key);
    const { gte, lt } = monthRange(month);

    const employees = await this.prisma.employee.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { assignments: { where: { orgId, date: { gte, lt } } } },
    });

    const rows: GridEmployee[] = employees.map((e) => {
      const cells: Record<string, string> = {};
      for (const a of e.assignments) cells[toIso(a.date)] = a.shift;
      const totals = computeTotals(Object.values(cells), tMap, bucketKeys);
      return { id: e.id, name: e.name, rank: e.rank, dept: e.dept, cells, totals };
    });

    return {
      month,
      orgName: cfg.name,
      days: monthDays(month),
      buckets,
      shiftTypes,
      employees: rows,
    };
  }

  // ── 직원 ─────────────────────────────────────────────────────────────
  listEmployees(orgId: string) {
    return this.prisma.employee.findMany({
      where: { orgId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createEmployee(
    orgId: string,
    dto: {
      name: string;
      rank?: string;
      dept?: string;
      sortOrder?: number;
      source?: string;
    },
  ) {
    if (!dto.name) throw new BadRequestException('name required');
    const max = await this.prisma.employee.aggregate({
      where: { orgId },
      _max: { sortOrder: true },
    });
    return this.prisma.employee.create({
      data: {
        orgId,
        name: dto.name,
        rank: dto.rank,
        dept: dto.dept,
        sortOrder: dto.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
        source: dto.source ?? 'service',
        syncStatus: 'synced',
      },
    });
  }

  async updateEmployee(
    orgId: string,
    id: string,
    dto: Partial<{ name: string; rank: string; dept: string; sortOrder: number }>,
  ) {
    await this.assertEmployeeInOrg(orgId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, syncStatus: 'synced' },
    });
  }

  /** 조직 스코프 삭제 — 다른 조직의 직원 id 로는 아무것도 지우지 않는다. */
  deleteEmployee(orgId: string, id: string) {
    return this.prisma.employee.deleteMany({ where: { id, orgId } });
  }

  // ── 셀(배정) ─────────────────────────────────────────────────────────
  /** 한 칸 설정. code 가 빈 값이면 배정 삭제. source 로 소유 구분. */
  async setCell(
    orgId: string,
    employeeId: string,
    iso: string,
    code: string,
    source: 'service' | 'sheet' = 'service',
  ) {
    await this.assertEmployeeInOrg(orgId, employeeId);
    const date = fromIso(iso);
    const shift = (code ?? '').trim();

    if (!shift) {
      await this.prisma.assignment.deleteMany({ where: { orgId, employeeId, date } });
    } else {
      await this.prisma.assignment.upsert({
        where: { employeeId_date: { employeeId, date } },
        create: { orgId, employeeId, date, shift, source, syncStatus: 'synced' },
        update: { shift, source, syncStatus: 'synced' },
      });
    }
    return this.employeeTotals(orgId, employeeId);
  }

  /** 한 직원의 현재 활성월 합계 (응답 갱신용) */
  async employeeTotals(orgId: string, employeeId: string) {
    const cfg = await this.config(orgId);
    const { gte, lt } = monthRange(cfg.activeMonth);
    const [assignments, buckets, tMap] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { orgId, employeeId, date: { gte, lt } },
      }),
      this.buckets(orgId),
      this.typeMap(orgId),
    ]);
    return computeTotals(
      assignments.map((a) => a.shift),
      tMap,
      buckets.map((b) => b.key),
    );
  }

  // ── 근무형태(시프트) 세팅 ─────────────────────────────────────────────
  upsertShiftType(
    orgId: string,
    dto: {
      code: string;
      label: string;
      bgColor?: string;
      fgColor?: string;
      sortOrder?: number;
      contributions?: Contribution[];
    },
  ) {
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
      where: { orgId_code: { orgId, code: dto.code } },
      create: { orgId, code: dto.code, ...data },
      update: data,
    });
  }

  deleteShiftType(orgId: string, code: string) {
    return this.prisma.shiftType.delete({
      where: { orgId_code: { orgId, code } },
    });
  }

  /** employeeId 가 이 조직 소속인지 확인 — 교차 테넌트 변경 차단. */
  private async assertEmployeeInOrg(orgId: string, employeeId: string) {
    const found = await this.prisma.employee.findFirst({
      where: { id: employeeId, orgId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('employee not found in org');
  }
}
