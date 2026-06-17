import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { SHEET_TAB } from './sheets.constants';

@Injectable()
export class SheetClientService implements OnModuleInit {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId = process.env.SHEET_ID!;

  onModuleInit() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SA_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  /** id로 시트 행 번호 찾기 (A열 전체 조회) — 행 삽입/삭제로 rowIndex가 밀려도 안전 */
  async findRowIndexById(id: string): Promise<number | null> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!A2:A`,
    });
    const ids = res.data.values ?? [];
    const idx = ids.findIndex((r) => String(r[0]) === id);
    return idx === -1 ? null : idx + 2; // +2: 1-based & 헤더 제외
  }

  async writeRange(rangeA1: string, values: any[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!${rangeA1}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  /** 시트 끝에 새 행 추가 (웹에서 신규 생성 시). API 쓰기라 onEdit 안 터짐. */
  async appendRow(values: any[]) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  }

  /** 시트 전체 데이터 행 읽기 (재동기화용). onEdit이 못 잡는 삭제를 맞추는 데 쓴다. */
  async readAll() {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SHEET_TAB}!A2:H`,
    });
    return (res.data.values ?? []).map((row, i) => ({
      rowIndex: i + 2,
      id: String(row[0] ?? ''),
      name: (row[1] ?? '') as string,
      price: row[2],
      status: (row[3] ?? 'active') as string,
      memo: (row[4] ?? null) as string | null,
    }));
  }
}
