import { Injectable } from '@nestjs/common';
import { SheetClientService } from './sheet-client.service';
import {
  COL_ID,
  DAY_START_COL,
  colLetter,
  totalsStartCol,
} from './sheets.constants';

export interface EmployeeRowOut {
  empId: string;
  name: string;
  rank: string;
  codes: string[]; // 길이 = dayCount
  totals: number[]; // 버킷 순서대로
}

@Injectable()
export class SheetWriterService {
  constructor(private client: SheetClientService) {}

  /** 신규 직원행: 운영팀이 만든 행에 DB가 발급한 empId를 A열에 회신 */
  async writeId(tab: string, rowIndex: number, empId: string) {
    await this.client.writeRange(tab, `${colLetter(COL_ID)}${rowIndex}`, [[empId]]);
  }

  /**
   * 기존 직원행 갱신 (DB→시트). A열 empId + 날짜셀 + 합계열을 되쓴다.
   * 성명/직급(B,C)은 운영팀 소유라 건드리지 않는다. API 쓰기 → onEdit 미발생.
   */
  async pushRow(tab: string, rowIndex: number, row: EmployeeRowOut) {
    const dayCount = row.codes.length;
    await this.client.writeRange(tab, `${colLetter(COL_ID)}${rowIndex}`, [[row.empId]]);

    const from = colLetter(DAY_START_COL);
    const to = colLetter(totalsStartCol(dayCount) + row.totals.length - 1);
    await this.client.writeRange(tab, `${from}${rowIndex}:${to}${rowIndex}`, [
      [...row.codes, ...row.totals],
    ]);
  }

  /**
   * 합계열만 갱신 (시트→DB 동기화 시). 날짜셀은 방금 운영팀이 편집한 값이라 안 건드림.
   * dayCount = 그 달 일수, totals = 버킷 순서.
   */
  async pushTotals(tab: string, rowIndex: number, dayCount: number, totals: number[]) {
    if (!totals.length) return;
    const from = colLetter(totalsStartCol(dayCount));
    const to = colLetter(totalsStartCol(dayCount) + totals.length - 1);
    await this.client.writeRange(tab, `${from}${rowIndex}:${to}${rowIndex}`, [totals]);
  }

  /** empId로 행을 찾아 갱신. 없으면 시트 끝에 새 행 추가. */
  async upsertRow(tab: string, row: EmployeeRowOut) {
    const rowIndex = await this.client.findEmployeeRowById(tab, row.empId);
    if (rowIndex) {
      await this.pushRow(tab, rowIndex, row);
      return;
    }
    await this.client.appendRow(tab, [
      row.empId,
      row.name,
      row.rank,
      ...row.codes,
      ...row.totals,
    ]);
  }
}
