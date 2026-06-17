import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SheetEmployeeRow } from '../sheets/sheets.types';

@Injectable()
export class SyncProducer {
  constructor(@InjectQueue('sheet-sync') private queue: Queue) {}

  /** 시트→DB: 직원 행 단위 직렬화 (empId 없으면 rowIndex로) */
  async enqueueSheetToDb(month: string, row: SheetEmployeeRow) {
    await this.queue.add(
      'sheet-to-db',
      { month, row },
      {
        jobId: `sheet-${row.empId || 'new-' + row.rowIndex}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  /** DB→시트: 같은 직원이면 직렬화 */
  async enqueueDbToSheet(employeeId: string) {
    await this.queue.add(
      'db-to-sheet',
      { employeeId },
      {
        jobId: `db-${employeeId}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
