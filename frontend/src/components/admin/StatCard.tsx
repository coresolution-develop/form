import { cn } from '@/lib/cn';

interface Props {
  label: string;
  value: number;
  highlight?: boolean;
}

/** 대시보드 숫자 위젯 카드 (§10.3). 0도 정상 표시. */
export function StatCard({ label, value, highlight }: Props) {
  return (
    <div
      className={cn(
        'rounded-[10px] border p-4',
        highlight && value > 0
          ? 'border-danger-border bg-[#fffaf9]'
          : 'border-line bg-white',
      )}
    >
      <p className="text-xs text-ink-400">{label}</p>
      <p
        className={cn(
          'mt-2 text-[26px] font-semibold tracking-[-0.7px] tabular-nums',
          highlight && value > 0 ? 'text-danger-fg' : 'text-ink-900',
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
