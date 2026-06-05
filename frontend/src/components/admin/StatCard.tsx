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
        'rounded-xl border p-5',
        highlight && value > 0
          ? 'border-red-200 bg-red-50'
          : 'border-gray-200 bg-white',
      )}
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p
        className={cn(
          'mt-2 text-3xl font-bold',
          highlight && value > 0 ? 'text-red-600' : 'text-gray-900',
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
