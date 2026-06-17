export const SHEET_TAB = process.env.SHEET_TAB ?? '근무표';

/**
 * 근무표 그리드 시트 계약 (재구성된 깔끔한 구조).
 *
 *   A1            = 활성 월 "YYYY-MM" (앵커)
 *   2행(헤더)     = A:empId | B:성명 | C:직급 | D..:날짜(1..N) | 그 뒤:합계열(M HD / Y)
 *   3행~          = 직원 1명 = 1행
 *
 * 소유: 운영팀 = 성명/직급/날짜셀,  서비스 = empId(A) + 합계열.
 * 단, 웹에서 만든 변경은 서비스가 날짜셀도 API로 되써준다(API 쓰기는 onEdit 미발생 → 루프 없음).
 */
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
