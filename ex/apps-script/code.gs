/**
 * Apps Script — 근무표 그리드 installable onEdit 트리거
 * 등록: 편집기 → 트리거 → onEditInstallable / 스프레드시트에서 / 수정 시.
 * SECRET 실제 값은 커밋하지 말 것 — Apps Script 편집기에서만 직접 설정한다.
 *
 * 시트 계약 (sheets.constants.ts 와 일치):
 *   A1            = 활성 월 "YYYY-MM"
 *   2행(헤더)     = A:empId | B:성명 | C:직급 | D..:날짜(1..N) | 뒤:합계열
 *   3행~          = 직원 1명 = 1행
 * 편집된 행의 (empId, 성명, 직급, 날짜셀 전체)를 webhook 으로 보낸다.
 */
const WEBHOOK_BASE = 'https://form.sosyge.net/ex/sync'; // 운영 주소
const SECRET = 'PUT_THE_SAME_SECRET_AS_ENV'; // .env 의 SHEET_WEBHOOK_SECRET 와 동일 값
const GRID_PREFIX = '근무표'; // 월별 그리드 탭 접두사 (근무표-YYYY-MM)
const SETTINGS_TAB = '설정'; // 근무형태 세팅 탭
const GRID_TAB_RE = /^근무표-\d{4}-\d{2}$/; // 근무표-YYYY-MM 매칭

const MONTH_CELL = 'A1';
const DATA_START_ROW = 3;
const COL_ID = 1; // A
const COL_NAME = 2; // B
const COL_RANK = 3; // C
const DAY_START_COL = 4; // D = 1일

function daysInMonth_(month) {
  const parts = month.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return new Date(y, m, 0).getDate(); // m월 0일 = 말일
}

function onEditInstallable(e) {
  const range = e.range;
  const sheet = range.getSheet();
  const name = sheet.getName();

  // 설정 탭 편집 → 본문 없이 webhook (서버가 탭 전체 재읽기)
  if (name === SETTINGS_TAB) {
    UrlFetchApp.fetch(WEBHOOK_BASE + '/settings-webhook', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'X-Webhook-Secret': SECRET },
      payload: '{}',
      muteHttpExceptions: true,
    });
    return;
  }

  if (!GRID_TAB_RE.test(name)) return; // 근무표-YYYY-MM 탭만 처리

  const month = String(sheet.getRange(MONTH_CELL).getValue() || '').trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return; // 월 앵커 없으면 무시
  const dayCount = daysInMonth_(month);
  const lastDayCol = DAY_START_COL + dayCount - 1;

  const startRow = Math.max(range.getRow(), DATA_START_ROW);
  const endRow = range.getRow() + range.getNumRows() - 1;
  if (endRow < DATA_START_ROW) return; // 헤더/메타 영역 편집은 무시

  // 편집이 합계열(서비스 소유)뿐이면 무시 — 사람이 만질 영역 아님
  if (range.getColumn() > lastDayCol) return;

  const rows = [];
  for (let r = startRow; r <= endRow; r++) {
    const vals = sheet.getRange(r, COL_ID, 1, lastDayCol).getValues()[0];
    const codes = [];
    for (let d = 0; d < dayCount; d++) {
      const v = vals[DAY_START_COL - 1 + d];
      codes.push(v === null || v === undefined ? '' : String(v).trim());
    }
    rows.push({
      rowIndex: r,
      empId: String(vals[COL_ID - 1] || '').trim(),
      name: String(vals[COL_NAME - 1] || '').trim(),
      rank: String(vals[COL_RANK - 1] || '').trim(),
      codes: codes,
    });
  }

  UrlFetchApp.fetch(WEBHOOK_BASE + '/sheet-webhook', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Webhook-Secret': SECRET },
    payload: JSON.stringify({ month: month, rows: rows }),
    muteHttpExceptions: true,
  });
}
