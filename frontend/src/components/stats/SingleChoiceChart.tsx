'use client';

import { ChoiceBars } from '@/components/stats/ChoiceBars';
import type { Distribution } from '@/types/stats';

export function SingleChoiceChart({ distribution }: { distribution: Distribution[] }) {
  return <ChoiceBars distribution={distribution} />;
}
