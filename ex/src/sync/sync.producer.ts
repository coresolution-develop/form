import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SheetEmployeeRow } from '../sheets/sheets.types';

/**
 * 동기화 잡 producer. 모든 잡 페이로드/ jobId 에 orgId 를 포함해 테넌트 간 격리.
 * (jobId 의 'new-${rowIndex}' 는 시트 내에서만 유일 → orgId 접두사 없으면 조직 간 충돌)
 */
@Injectable()
export class SyncProducer {
  constructor(@InjectQueue('sheet-sync') private queue: Queue) {}

  /** 시트→DB: 직원 행 단위 직렬화 (empId 없으면 rowIndex로) */
  async enqueueSheetToDb(orgId: string, month: string, row: SheetEmployeeRow) {
    await this.queue.add(
      'sheet-to-db',
      { orgId, month, row },
      {
        jobId: `sheet-${orgId}-${row.empId || 'new-' + row.rowIndex}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  /** DB→시트: 같은 (조직, 직원, 월)이면 직렬화 */
  async enqueueDbToSheet(orgId: string, employeeId: string, month: string) {
    await this.queue.add(
      'db-to-sheet',
      { orgId, employeeId, month },
      {
        jobId: `db-${orgId}-${employeeId}-${month}`,
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
  async enqueueSettingsToSheet(orgId: string) {
    await this.queue.add(
      'settings-to-sheet',
      { orgId },
      { removeOnComplete: true, removeOnFail: true },
    );
  }

  /** 설정 시트→DB: 설정 탭 전체 재읽기 */
  async enqueueSheetToSettings(orgId: string) {
    await this.queue.add(
      'sheet-to-settings',
      { orgId },
      { removeOnComplete: true, removeOnFail: true },
    );
  }
}
