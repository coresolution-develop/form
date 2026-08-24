'use client';

import { ChoiceBars } from '@/components/stats/ChoiceBars';
import type { Distribution } from '@/types/stats';

export function MultiChoiceChart({ distribution }: { distribution: Distribution[] }) {
  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">복수 선택 가능 — 비율 합이 100%를 넘을 수 있습니다.</p>
      <ChoiceBars distribution={distribution} />
    </div>
  );
}
