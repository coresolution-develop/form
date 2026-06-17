import { Injectable, OnModuleInit } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import {
  COL_ID,
  COL_NAME,
  COL_RANK,
  DATA_START_ROW,
  DAY_START_COL,
  MONTH_CELL,
  SETTINGS_TAB,
  SET_BUCKET_START_COL,
  SET_DATA_START_ROW,
  colLetter,
  dayCol,
  settingsLastCol,
} from './sheets.constants';
import { SheetEmployeeRow, SettingRow } from './sheets.types';

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

  /** 탭 존재 여부 확인 후 없으면 생성 (월 롤 시 새 탭). */
  async ensureTab(title: string): Promise<boolean> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const exists = (meta.data.sheets ?? []).some(
      (s) => s.properties?.title === title,
    );
    if (!exists) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] },
      });
    }
    return exists; // true면 이미 있던 탭
  }

  async tabExists(title: string): Promise<boolean> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: 'sheets.properties.title',
    });
    return (meta.data.sheets ?? []).some((s) => s.properties?.title === title);
  }

  /** 탭 A1 의 월("YYYY-MM") 읽기 */
  async readMonth(tab: string): Promise<string | null> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!${MONTH_CELL}`,
    });
    const v = res.data.values?.[0]?.[0];
    return v ? String(v).trim() : null;
  }

  /** empId로 직원 행 번호 찾기 (A열 스캔) — 행 삽입/삭제로 밀려도 안전 */
  async findEmployeeRowById(tab: string, empId: string): Promise<number | null> {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!${colLetter(COL_ID)}${DATA_START_ROW}:${colLetter(COL_ID)}`,
    });
    const ids = res.data.values ?? [];
    const idx = ids.findIndex((r) => String(r[0] ?? '') === empId);
    return idx === -1 ? null : idx + DATA_START_ROW;
  }

  /** 그리드 전체 읽기 (재동기화/삭제보정용). dayCount = 그 달 일수. */
  async readGrid(tab: string, dayCount: number): Promise<SheetEmployeeRow[]> {
    const lastCol = colLetter(dayCol(dayCount));
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!${colLetter(COL_ID)}${DATA_START_ROW}:${lastCol}`,
    });
    const rows = res.data.values ?? [];
    return rows.map((row, i) => {
      const codes: string[] = [];
      for (let d = 0; d < dayCount; d++) {
        codes.push(String(row[DAY_START_COL - 1 + d] ?? '').trim());
      }
      return {
        rowIndex: i + DATA_START_ROW,
        empId: String(row[COL_ID - 1] ?? '').trim(),
        name: String(row[COL_NAME - 1] ?? '').trim(),
        rank: String(row[COL_RANK - 1] ?? '').trim(),
        codes,
      };
    });
  }

  async writeRange(tab: string, rangeA1: string, values: any[][]) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!${rangeA1}`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  /** 시트 끝에 새 직원 행 추가. API 쓰기라 onEdit 안 터짐. */
  async appendRow(tab: string, values: any[]) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${tab}!${colLetter(COL_ID)}${DATA_START_ROW}`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });
  }

  // ── `설정` 탭 (근무형태 세팅) ────────────────────────────────────────
  /** 설정 탭 전체 읽기. bucketCount = 가중치 열 수. */
  async readSettings(bucketCount: number): Promise<SettingRow[]> {
    const lastCol = settingsLastCol(bucketCount);
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${SETTINGS_TAB}!A${SET_DATA_START_ROW}:${lastCol}`,
    });
    const rows = res.data.values ?? [];
    return rows
      .filter((r) => String(r[0] ?? '').trim() !== '')
      .map((r) => ({
        code: String(r[0]).trim(),
        label: String(r[1] ?? '').trim(),
        bg: String(r[2] ?? '').trim() || 'transparent',
        fg: String(r[3] ?? '').trim(),
        weights: Array.from({ length: bucketCount }, (_, i) => {
          const v = parseFloat(r[SET_BUCKET_START_COL - 1 + i]);
          return Number.isNaN(v) ? 0 : v;
        }),
      }));
  }

  /** 설정 탭 A1부터 블록(헤더+행) 기록 + 그 아래 잔여 행 비우기. */
  async writeSettings(values: any[][], bucketCount: number) {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${SETTINGS_TAB}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
    const lastCol = settingsLastCol(bucketCount);
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `${SETTINGS_TAB}!A${values.length + 1}:${lastCol}1000`,
    });
  }
}
