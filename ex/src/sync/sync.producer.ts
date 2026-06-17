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

  /** DB→시트: 같은 (직원, 월)이면 직렬화 */
  async enqueueDbToSheet(employeeId: string, month: string) {
    await this.queue.add(
      'db-to-sheet',
      { employeeId, month },
      {
        jobId: `db-${employeeId}-${month}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  /**
   * 설정 DB→시트: 설정 탭 전체 재기록.
   * 고정 jobId 를 쓰지 않는다 — 실패한 잡이 retain 되면 같은 jobId 재추가가
   * BullMQ에서 무시돼 영영 안 돌기 때문(전체 재기록이라 합쳐질 필요도 없음).
   */
  async enqueueSettingsToSheet() {
    await this.queue.add(
      'settings-to-sheet',
      {},
      { removeOnComplete: true, removeOnFail: true },
    );
  }

  /** 설정 시트→DB: 설정 탭 전체 재읽기 */
  async enqueueSheetToSettings() {
    await this.queue.add(
      'sheet-to-settings',
      {},
      { removeOnComplete: true, removeOnFail: true },
    );
  }
}
