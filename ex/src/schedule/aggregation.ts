import { Contribution } from './seed.data';

export interface ShiftTypeLite {
  code: string;
  contributions: Contribution[];
}

/**
 * 한 직원의 시프트 코드 목록 → 버킷별 합계.
 * 코드별 (버킷, 가중치)를 누적할 뿐이라 시트의 숨은 헬퍼 열(AQ~AX)을 그대로 대체한다.
 *
 * @param codes   직원의 한 달 시프트 코드들 (빈칸 제외)
 * @param typeMap code → ShiftType (contributions 포함)
 * @param buckets 합계를 낼 버킷 키 목록 (이 키들만 0으로 초기화해 반환)
 */
export function computeTotals(
  codes: string[],
  typeMap: Map<string, ShiftTypeLite>,
  buckets: string[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const b of buckets) totals[b] = 0;

  for (const code of codes) {
    if (!code) continue;
    const t = typeMap.get(code);
    if (!t) continue; // 미정의 코드는 0 기여 (세팅에 추가하면 반영됨)
    for (const { bucket, weight } of t.contributions ?? []) {
      if (bucket in totals) totals[bucket] += weight;
    }
  }

  // 부동소수 누적 오차 정리 (0.5 단위라 소수 1자리면 충분)
  for (const b of buckets) totals[b] = Math.round(totals[b] * 10) / 10;
  return totals;
}
