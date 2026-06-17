import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SheetRowPayload } from '../sheets/sheets.types';

@Injectable()
export class SyncProducer {
  constructor(@InjectQueue('sheet-sync') private queue: Queue) {}

  /** 시트→DB: 행 id(없으면 rowIndex)로 직렬화 */
  async enqueueSheetToDb(row: SheetRowPayload) {
    await this.queue.add('sheet-to-db', row, {
      jobId: `sheet:${row.id || 'new:' + row.rowIndex}`,
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  /** DB→시트: 같은 id면 직렬화 */
  async enqueueDbToSheet(id: string) {
    await this.queue.add(
      'db-to-sheet',
      { id },
      {
        jobId: `db:${id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
