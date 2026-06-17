import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SheetWriterService } from '../sheets/sheet-writer.service';
import { SheetClientService } from '../sheets/sheet-client.service';
import { SheetEmployeeRow } from '../sheets/sheets.types';
import { daysInMonth } from '../schedule/dates';
import {
  codesForMonth,
  loadAggContext,
  orderedTotals,
  replaceMonthAssignments,
} from '../schedule/grid-ops';
import { monthRange } from '../schedule/dates';

/**
 * 한 큐('sheet-sync')에 워커는 하나. 그리드 동기화를 job.name 으로 분기한다.
 *  - sheet-to-db: 시트의 한 직원 행(날짜셀들) → DB 배정 통째 교체 + 합계 되쓰기
 *  - db-to-sheet: DB의 한 직원 → 시트 날짜셀+합계 되쓰기 (웹 편집 반영)
 */
@Processor('sheet-sync')
export class SyncProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private writer: SheetWriterService,
    private client: SheetClientService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sheet-to-db':
        await this.handleSheetToDb(job.data as { month: string; row: SheetEmployeeRow });
        break;
      case 'db-to-sheet':
        await this.handleDbToSheet(job.data as { employeeId: string });
        break;
    }
  }

  /** 시트 → DB */
  private async handleSheetToDb({
    month,
    row,
  }: {
    month: string;
    row: SheetEmployeeRow;
  }) {
    if (!row.name) return; // 빈 행 방어

    // 1. 직원 upsert (신규면 DB가 id 발급)
    const isNew = !row.empId;
    const emp = isNew
      ? await this.prisma.employee.create({
          data: { name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
        })
      : await this.prisma.employee.upsert({
          where: { id: row.empId },
          create: { id: row.empId, name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
          update: { name: row.name, rank: row.rank || null, source: 'sheet', syncStatus: 'synced' },
        });

    // 2. 날짜셀 → 배정 통째 교체
    const dayCount = daysInMonth(month);
    const codes = Array.from({ length: dayCount }, (_, i) => row.codes[i] ?? '');
    await replaceMonthAssignments(this.prisma, emp.id, month, codes, 'sheet');

    // 3. 합계 재계산 → 시트 되쓰기 (서비스 소유 열만 → 루프 없음)
    const { tMap, bucketKeys } = await loadAggContext(this.prisma);
    const totals = orderedTotals(codes, tMap, bucketKeys);

    if (isNew) await this.writer.writeId(row.rowIndex, emp.id);
    const rowIndex = isNew
      ? row.rowIndex
      : (await this.client.findEmployeeRowById(emp.id)) ?? row.rowIndex;
    await this.writer.pushTotals(rowIndex, dayCount, totals);
  }

  /** DB → 시트 (웹 편집 반영: 날짜셀 + 합계) */
  private async handleDbToSheet({ employeeId }: { employeeId: string }) {
    const cfg = await this.prisma.scheduleConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    const month = cfg.activeMonth;
    const { gte, lt } = monthRange(month);

    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { assignments: { where: { date: { gte, lt } } } },
    });
    if (!emp) return;

    const codes = codesForMonth(emp.assignments, month);
    const { tMap, bucketKeys } = await loadAggContext(this.prisma);
    const totals = orderedTotals(codes, tMap, bucketKeys);

    await this.writer.upsertRow({
      empId: emp.id,
      name: emp.name,
      rank: emp.rank || '',
      codes,
      totals,
    });
  }
}
