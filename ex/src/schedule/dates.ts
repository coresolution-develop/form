/** YYYY-MM 헬퍼 — 시트/그리드의 "활성 월"을 다룬다. 모두 UTC 기준으로 날짜만 취급. */

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

/** 해당 월의 일수 */
export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 다음 달 (2026-12 → 2027-01) */
export function nextMonth(month: string): string {
  let [y, m] = month.split('-').map(Number);
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** month의 day일을 'YYYY-MM-DD' 로 */
export function isoDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`;
}

export interface DayMeta {
  day: number;
  iso: string;
  dow: number; // 0=일 … 6=토
  dowLabel: string;
  weekend: boolean;
}

/** month의 모든 날짜 메타 (1일~말일) */
export function monthDays(month: string): DayMeta[] {
  const [y, m] = month.split('-').map(Number);
  const n = daysInMonth(month);
  const out: DayMeta[] = [];
  for (let day = 1; day <= n; day++) {
    const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
    out.push({
      day,
      iso: isoDate(month, day),
      dow,
      dowLabel: WEEKDAY_KO[dow],
      weekend: dow === 0 || dow === 6,
    });
  }
  return out;
}

/** Date(@db.Date) → 'YYYY-MM-DD' (UTC) */
export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → Date (UTC 자정) — Prisma @db.Date 저장용 */
export function fromIso(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** 월의 [시작, 끝(다음달 1일)] 경계 — date 범위 쿼리용 */
export function monthRange(month: string): { gte: Date; lt: Date } {
  const [y, m] = month.split('-').map(Number);
  return {
    gte: new Date(Date.UTC(y, m - 1, 1)),
    lt: new Date(Date.UTC(y, m, 1)),
  };
}
