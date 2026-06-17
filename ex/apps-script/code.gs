/**
 * Google Apps Script — installable onEdit 트리거
 *
 * simple 트리거는 외부 호출(UrlFetchApp)이 막혀 있으므로 반드시 installable 트리거로 등록한다.
 * 등록: Apps Script 편집기 → 좌측 시계 아이콘(트리거) → 트리거 추가
 *       → 함수 onEditInstallable / 이벤트 소스 '스프레드시트에서' / 이벤트 유형 '수정 시'
 */
const WEBHOOK_URL = 'https://your-server.com/sync/sheet-webhook'; // 실제 서버(또는 ngrok) URL
const SECRET = 'PUT_THE_SAME_SECRET_AS_ENV'; // .env 의 SHEET_WEBHOOK_SECRET 와 동일
const TAB_NAME = 'Sheet1';
const OWNER_LAST_COL = 5; // A~E (운영팀 소유 컬럼 범위)

function onEditInstallable(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== TAB_NAME) return;

  const startRow = range.getRow();
  const numRows = range.getNumRows();
  if (startRow < 2) return; // 헤더 제외

  // 운영팀 소유 컬럼(A~E)만 동기화 대상 (F~H 는 서비스 소유라 제외)
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
