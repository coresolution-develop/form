'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Distribution } from '@/types/stats';

export function MultiChoiceChart({ distribution }: { distribution: Distribution[] }) {
  const data = distribution.map((d) => ({
    ...d,
    barLabel: `${d.count}명 (${Math.round((d.ratio ?? 0) * 100)}%)`,
  }));
  const height = Math.max(120, data.length * 44);
  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">복수 선택 가능 — 비율 합이 100%를 넘을 수 있습니다.</p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 72 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="value" width={120} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v: number, _n, p: any) => [`${v}명 (${Math.round((p.payload.ratio ?? 0) * 100)}%)`, '응답']}
          />
          <Bar dataKey="count" fill="#378ADD" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="barLabel" position="right" fill="#4b5563" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
