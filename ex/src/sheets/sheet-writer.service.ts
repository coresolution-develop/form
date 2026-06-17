import { Injectable } from '@nestjs/common';
import { SheetClientService } from './sheet-client.service';
import { COL } from './sheets.constants';

@Injectable()
export class SheetWriterService {
  constructor(private client: SheetClientService) {}

  /** 신규행: 운영팀이 만든 행에 DB가 발급한 id를 A열에 회신 */
  async writeId(rowIndex: number, id: string) {
    await this.client.writeRange(`${COL.id}${rowIndex}`, [[id]]);
  }

  /** 서비스 소유 컬럼(F~H)에만 반영 — 운영팀 컬럼은 절대 건드리지 않음 */
  async pushServiceFields(
    id: string,
    fields: { syncStatus: string; computed: number; updatedAt: string },
  ) {
    const rowIndex = await this.client.findRowIndexById(id);
    if (!rowIndex) return; // 시트에서 행이 사라졌으면 스킵
    await this.client.writeRange(
      `${COL.syncStatus}${rowIndex}:${COL.updatedAt}${rowIndex}`,
      [[fields.syncStatus, fields.computed, fields.updatedAt]],
    );
  }
}
