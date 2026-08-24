'use client';

import type { Distribution } from '@/types/stats';

/** 선택형 필드 분포를 옵션별 프로그레스 바 목록으로 표시. 최다 선택 옵션은 브랜드 컬러로 강조. */
export function ChoiceBars({ distribution }: { distribution: Distribution[] }) {
  if (distribution.length === 0) {
    return <p className="text-sm text-ink-300">아직 응답이 없습니다.</p>;
  }
  const maxCount = Math.max(...distribution.map((d) => d.count));
  return (
    <ul className="flex flex-col gap-1.5">
      {distribution.map((d) => {
        const percent = Math.round((d.ratio ?? 0) * 100);
        const isTop = maxCount > 0 && d.count === maxCount;
        return (
          <li key={d.value} className="relative overflow-hidden rounded-lg bg-surface-subtle">
            <div
              aria-hidden
              className={`absolute inset-y-0 left-0 rounded-lg ${isTop ? 'bg-brand/25' : 'bg-brand-light'}`}
              style={{ width: `${d.count > 0 ? Math.max(percent, 2) : 0}%` }}
            />
            <div className="relative flex items-center justify-between gap-3 px-3 py-2">
              <span className={`truncate text-[13px] ${isTop ? 'font-medium text-ink-900' : 'text-ink-700'}`}>
                {d.value}
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-ink-500">
                {d.count.toLocaleString()}명 ·{' '}
                <span className={isTop ? 'font-semibold text-brand-dark' : ''}>{percent}%</span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
