import { PrismaService } from '../prisma/prisma.service';
import { computeTotals, ShiftTypeLite } from './aggregation';
import { Contribution } from './seed.data';
import { daysInMonth, isoDate, monthRange, fromIso, toIso } from './dates';

/** 집계에 필요한 컨텍스트 (시프트 맵 + 버킷 순서)를 한 번에 로드 */
export async function loadAggContext(prisma: PrismaService) {
  const [types, buckets] = await Promise.all([
    prisma.shiftType.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.aggregateBucket.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  const tMap = new Map<string, ShiftTypeLite>(
    types.map((t) => [
      t.code,
      { code: t.code, contributions: (t.contributions ?? []) as unknown as Contribution[] },
    ]),
  );
  const bucketKeys = buckets.map((b) => b.key);
  return { tMap, bucketKeys };
}

/** 코드 배열(1..N일) → 버킷 순서대로 정렬된 합계 숫자 배열 */
export function orderedTotals(
  codes: string[],
  tMap: Map<string, ShiftTypeLite>,
  bucketKeys: string[],
): number[] {
  const totals = computeTotals(codes, tMap, bucketKeys);
  return bucketKeys.map((k) => totals[k]);
}

/** 한 직원의 한 달 배정을 통째로 교체 (시트→DB 동기화의 핵심). */
export async function replaceMonthAssignments(
  prisma: PrismaService,
  employeeId: string,
  month: string,
  codes: string[],
  source: 'sheet' | 'service',
) {
  const { gte, lt } = monthRange(month);
  await prisma.assignment.deleteMany({ where: { employeeId, date: { gte, lt } } });

  const data = codes
    .map((code, i) => ({ code: (code ?? '').trim(), day: i + 1 }))
    .filter((x) => x.code !== '')
    .map((x) => ({
      employeeId,
      date: fromIso(isoDate(month, x.day)),
      shift: x.code,
      source,
      syncStatus: 'synced',
    }));

  if (data.length) await prisma.assignment.createMany({ data });
}

/** 직원의 활성월 배정 → 길이 N(일수) 코드 배열 (빈칸은 '') */
export function codesForMonth(
  assignments: { date: Date; shift: string }[],
  month: string,
): string[] {
  const n = daysInMonth(month);
  const codes = new Array(n).fill('');
  for (const a of assignments) {
    const iso = toIso(a.date);
    const day = Number(iso.slice(8, 10));
    if (day >= 1 && day <= n) codes[day - 1] = a.shift;
  }
  return codes;
}
