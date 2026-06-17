/**
 * 근무표 그리드 시트 계약 — 월별 탭(원본 방식).
 *
 *   탭 이름       = `근무표-YYYY-MM` (월마다 한 탭, 과거 탭은 아카이브로 보존)
 *   A1            = 그 탭의 월 "YYYY-MM" (앵커)
 *   2행(헤더)     = A:empId | B:성명 | C:직급 | D..:날짜(1..N) | 그 뒤:합계열(M HD / Y)
 *   3행~          = 직원 1명 = 1행
 *
 * 소유: 운영팀 = 성명/직급/날짜셀,  서비스 = empId(A) + 합계열.
 * 단, 웹에서 만든 변경은 서비스가 날짜셀도 API로 되써준다(API 쓰기는 onEdit 미발생 → 루프 없음).
 */
export const GRID_TAB_PREFIX = process.env.SHEET_TAB ?? '근무표';
/** 월 → 탭 이름 (예: 2026-07 → 근무표-2026-07) */
export const gridTab = (month: string) => `${GRID_TAB_PREFIX}-${month}`;
export const MONTH_CELL = 'A1';
export const HEADER_ROW = 2;
export const DATA_START_ROW = 3;

export const COL_ID = 1; // A
export const COL_NAME = 2; // B
export const COL_RANK = 3; // C
export const DAY_START_COL = 4; // D = 1일

/** 1-based 컬럼 인덱스 → A1 문자 (A, B, … Z, AA, AB …) */
export function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** day(1-based) → 컬럼 인덱스 */
export const dayCol = (day: number) => DAY_START_COL + day - 1;

/** 합계열 시작 인덱스 (날짜 N일 다음 칸) */
export const totalsStartCol = (dayCount: number) => DAY_START_COL + dayCount;

/**
 * 근무형태 세팅 시트 계약 (별도 `설정` 탭, 양방향).
 *
 *   1행(헤더) = code | label | bg | fg | <버킷 라벨들...>
 *   2행~      = 근무형태 1종 = 1행. 색은 hex 텍스트(값)라 values API로 양방향 가능.
 *
 * 양방향: 웹 편집 → 탭 전체 재기록(API, onEdit 미발생). 탭 편집 → onEdit → 탭 전체 재읽기 → DB upsert/삭제.
 */
export const SETTINGS_TAB = process.env.SETTINGS_TAB ?? '설정';
export const SET_DATA_START_ROW = 2;
export const SET_COL_CODE = 1; // A
export const SET_COL_LABEL = 2; // B
export const SET_COL_BG = 3; // C
export const SET_COL_FG = 4; // D
export const SET_BUCKET_START_COL = 5; // E.. = 버킷별 가중치
export const settingsLastCol = (bucketCount: number) =>
  colLetter(SET_BUCKET_START_COL - 1 + bucketCount);
