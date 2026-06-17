/** 시트 한 직원 행(그리드) — 웹훅/읽기 공용 payload */
export interface SheetEmployeeRow {
  rowIndex: number;
  empId: string; // 비어있으면 신규(아직 id 미발급)
  name: string;
  rank: string;
  codes: string[]; // 날짜 1..N 시프트 코드. 빈 문자열 = 미배정
}

/** 시트→DB 웹훅 본문 */
export interface SheetWebhookBody {
  month: string; // YYYY-MM
  rows: SheetEmployeeRow[];
}

/** `설정` 탭 한 행 (근무형태 1종) */
export interface SettingRow {
  code: string;
  label: string;
  bg: string; // hex 또는 'transparent'
  fg: string;
  weights: number[]; // 버킷 순서대로 (0 = 미기여)
}
