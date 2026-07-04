'use client';

import type { NumberStats } from '@/types/stats';

/** 숫자형 필드 집계 요약(평균·최소·최대·합계). */
export function NumberSummary({ stats }: { stats: NumberStats }) {
  const cells = [
    { label: '평균', value: stats.average },
    { label: '최소', value: stats.min },
    { label: '최대', value: stats.max },
    { label: '합계', value: stats.sum },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg bg-gray-50 px-3 py-3 text-center">
          <div className="text-xs text-gray-400">{c.label}</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900">
            {c.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
