'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Distribution } from '@/types/stats';

export function SingleChoiceChart({ distribution }: { distribution: Distribution[] }) {
  const height = Math.max(120, distribution.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={distribution} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="value" width={100} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: number, _n, p: any) => [`${v}명 (${Math.round((p.payload.ratio ?? 0) * 100)}%)`, '응답']}
        />
        <Bar dataKey="count" fill="#378ADD" radius={[0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
