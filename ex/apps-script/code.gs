/**
 * Apps Script — installable onEdit 트리거
 * 등록: 편집기 → 트리거 → onEditInstallable / 스프레드시트에서 / 수정 시.
 * SECRET 실제 값은 커밋하지 말 것 — Apps Script 편집기에서만 직접 설정한다.
 */
const WEBHOOK_URL = 'https://form.sosyge.net/ex/sync/sheet-webhook'; // 운영 주소
const SECRET = 'PUT_THE_SAME_SECRET_AS_ENV'; // .env 의 SHEET_WEBHOOK_SECRET 와 동일 값
const TAB_NAME = '시트1';
const OWNER_LAST_COL = 5; // A~E (운영팀 소유 컬럼)

function onEditInstallable(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== TAB_NAME) return;

  const startRow = range.getRow();
  const numRows = range.getNumRows();
  if (startRow < 2) return; // 헤더 제외

  const values = sheet.getRange(startRow, 1, numRows, OWNER_LAST_COL).getValues();
  const rows = values.map((row, i) => ({
    rowIndex: startRow + i,
    id: String(row[0] || ''),
    name: row[1],
    price: row[2],
    status: row[3],
    memo: row[4],
  }));

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Webhook-Secret': SECRET },
    payload: JSON.stringify({ rows: rows }),
    muteHttpExceptions: true,
  });
}
