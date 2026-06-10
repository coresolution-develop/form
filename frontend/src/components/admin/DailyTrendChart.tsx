'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyCount } from '@/types/admin';

interface Props {
  signups: DailyCount[];
  responses: DailyCount[];
}

/** 최근 7일 일별 가입/응답 추이 (§10.3, Recharts). */
export function DailyTrendChart({ signups, responses }: Props) {
  const byDay = new Map<string, { day: string; signups: number; responses: number }>();
  for (const s of signups) {
    byDay.set(s.day, { day: s.day.slice(5), signups: s.count, responses: 0 });
  }
  for (const r of responses) {
    const key = r.day;
    const short = r.day.slice(5);
    const prev = byDay.get(key);
    if (prev) prev.responses = r.count;
    else byDay.set(key, { day: short, signups: 0, responses: r.count });
  }
  const data = Array.from(byDay.values());

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="signups" name="가입" fill="#378ADD" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="responses" name="응답" fill="#7c3aed" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
