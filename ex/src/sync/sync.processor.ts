import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Org } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { SheetClientService } from '../sheets/sheet-client.service';
import { SheetEmployeeRow } from '../sheets/sheets.types';
import { gridTab } from '../sheets/sheets.constants';
import { daysInMonth, monthRange } from '../schedule/dates';
import {
  codesForMonth,
  loadAggContext,
  orderedTotals,
  replaceMonthAssignments,
} from '../schedule/grid-ops';

/**
 * 한 큐('sheet-sync')에 워커는 하나. 그리드 동기화를 job.name 으로 분기한다.
 * 모든 잡은 payload.orgId 로 조직을 로드 → 그 조직의 sheetId/탭·orgId-스코프 쿼리만 만진다.
 *  - sheet-to-db: 시트의 한 직원 행(날짜셀들) → DB 배정 통째 교체 + 합계 되쓰기
 *  - db-to-sheet: DB의 한 직원 → 시트 날짜셀+합계 되쓰기 (웹 편집 반영)
 *  - settings-to-sheet / sheet-to-settings: `설정` 탭 양방향
 */
@Processor('sheet-sync')
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger('SyncProcessor');

  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
    private client: SheetClientService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const orgId = (job.data as { orgId?: string }).orgId;
    const org = orgId
      ? await this.prisma.org.findUnique({ where: { id: orgId } })
      : null;
    if (!org) {
      this.logger.warn(`job ${job.name} skipped: org not found (orgId=${orgId})`);
      return;
    }

    switch (job.name) {
      case 'sheet-to-db':
        await this.handleSheetToDb(org, job.data as { month: string; row: SheetEmployeeRow });
        break;
      case 'db-to-sheet':
        await this.handleDbToSheet(org, job.data as { employeeId: string; month: string });
        break;
      case 'settings-to-sheet':
        await this.handleSettingsToSheet(org);
        break;
      case 'sheet-to-settings':
        await this.handleSheetToSettings(org);
        break;
    }
  }

  /** 설정 DB → 시트 (설정 탭 전체 재기록) */
  private async handleSettingsToSheet(org: Org) {
    const [types, buckets] = await Promise.all([
      this.prisma.shiftType.findMany({ where: { orgId: org.id }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.aggregateBucket.findMany({ where: { orgId: org.id }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const header = ['code', 'label', 'bg', 'fg', ...buckets.map((b) => b.label)];
    const rows = types.map((t) => {
      const w: Record<string, number> = {};
      for (const c of (t.contributions ?? []) as any[]) w[c.bucket] = c.weight;
      return [
        t.code,
        t.label,
        t.bgColor,
        t.fgColor,
        ...buckets.map((b) => (b.key in w ? w[b.key] : '')),
      ];
    });
    await this.client.writeSettings(org.sheetId, org.settingsTab, [header, ...rows], buckets.length);
  }

  /** 설정 시트 → DB (설정 탭 전체 재읽기 → upsert + 삭제보정) */
  private async handleSheetToSettings(org: Org) {
    const buckets = await this.prisma.aggregateBucket.findMany({
      where: { orgId: org.id },
      orderBy: { sortOrder: 'asc' },
    });
    const rows = await this.client.readSettings(org.sheetId, org.settingsTab, buckets.length);

    const seen: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.code) continue;
      const contributions = buckets
        .map((b, idx) => ({ bucket: b.key, weight: r.weights[idx] }))
        .filter((c) => c.weight !== 0);
      const data = {
        label: r.label || r.code,
        bgColor: r.bg,
        fgColor: r.fg,
        sortOrder: i,
        contributions: contributions as any,
      };
      await this.prisma.shiftType.upsert({
        where: { orgId_code: { orgId: org.id, code: r.code } },
        create: { orgId: org.id, code: r.code, ...data },
        update: data,
      });
      seen.push(r.code);
    }
    // 시트에서 사라진 코드 삭제 — 이 조직 안에서만(교차 테넌트 삭제 금지). 시트가 비면 전부삭제 방지.
    if (seen.length) {
      await this.prisma.shiftType.deleteMany({
        where: { orgId: org.id, code: { notIn: seen } },
      });
    }
  }

  /** 시트 → DB */
  private async handleSheetToDb(
    org: Org,
    { month, row }: { month: string; row: SheetEmployeeRow },
  ) {
    if (!row.name) return; // 빈 행 방어

    // 1. 직원 upsert (신규면 DB가 id 발급)
    const isNew = !row.empId;
    const emp = isNew
      ? await this.prisma.employee.create({
          data: { orgId: org.id, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
        })
      : await this.prisma.employee.upsert({
          where: { id: row.empId },
          create: { id: row.empId, orgId: org.id, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
          update: { name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
        });

    // 2. 날짜셀 → 배정 통째 교체
    const dayCount = daysInMonth(month);
    const codes = Array.from({ length: dayCount }, (_, i) => row.codes[i] ?? '');
    await replaceMonthAssignments(this.prisma, org.id, emp.id, month, codes, 'sheet');

    // 3. 합계 재계산 → 시트 되쓰기 (서비스 소유 열만 → 루프 없음)
    const { tMap, bucketKeys } = await loadAggContext(this.prisma, org.id);
    const totals = orderedTotals(codes, tMap, bucketKeys);

    const tab = gridTab(org.gridTabPrefix, month);
    if (isNew) await this.writer.writeId(org.sheetId, tab, row.rowIndex, emp.id);
    const rowIndex = isNew
      ? row.rowIndex
      : (await this.client.findEmployeeRowById(org.sheetId, tab, emp.id)) ?? row.rowIndex;
    await this.writer.pushTotals(org.sheetId, tab, rowIndex, dayCount, totals);
  }

  /** DB → 시트 (웹 편집 반영: 날짜셀 + 합계). 해당 월 탭이 없으면 스킵. */
  private async handleDbToSheet(
    org: Org,
    { employeeId, month }: { employeeId: string; month: string },
  ) {
    const tab = gridTab(org.gridTabPrefix, month);
    if (!(await this.client.tabExists(org.sheetId, tab))) return; // 그 달 탭이 아직 없으면 건너뜀
    const { gte, lt } = monthRange(month);

    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, orgId: org.id },
      include: { assignments: { where: { orgId: org.id, date: { gte, lt } } } },
    });
    if (!emp) return;

    const codes = codesForMonth(emp.assignments, month);
    const { tMap, bucketKeys } = await loadAggContext(this.prisma, org.id);
    const totals = orderedTotals(codes, tMap, bucketKeys);

    await this.writer.upsertRow(org.sheetId, tab, {
      empId: emp.id,
      name: emp.name,
      rank: emp.rank || '',
      codes,
      totals,
    });
  }
}
