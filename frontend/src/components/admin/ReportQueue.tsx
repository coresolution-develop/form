'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/datetime';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  type AdminReportItem,
  type ReportStatus,
} from '@/types/admin';

interface Props {
  reports: AdminReportItem[];
  onProcess: (report: AdminReportItem) => void;
  onPreview: (report: AdminReportItem) => void;
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  PENDING: 'bg-warn-bg text-warn-fg',
  REVIEWING: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-ok-bg text-ok-fg',
  REJECTED: 'bg-surface-fill-hover text-ink-400',
};

/** §10.2 누적 감지 임계: 같은 폼 PENDING 3건 이상이면 우선 처리 강조. */
const ACCUMULATION_THRESHOLD = 3;

export function ReportQueue({ reports, onProcess, onPreview }: Props) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-input py-10 text-center text-sm text-ink-300">
        조건에 맞는 신고가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line-softer text-sm">
        <thead className="bg-surface-subtle">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-ink-500">신고일</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">대상 폼</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">사유</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">상세</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">상태</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">누적</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-softer bg-white">
          {reports.map((r) => {
            const hot = r.pendingCountForForm >= ACCUMULATION_THRESHOLD;
            return (
              <tr key={r.id} className={cn(hot && 'bg-danger-bg/50')}>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onPreview(r)}
                    className="block max-w-full truncate text-left text-brand hover:underline"
                    title={`${r.formTitle} 미리보기`}
                  >
                    {r.formTitle}
                  </button>
                  <Link
                    href={`/admin/users/${r.ownerId}`}
                    className="block max-w-full truncate text-xs text-ink-300 hover:text-ink-500 hover:underline"
                    title={r.ownerEmail}
                  >
                    소유자: {r.ownerEmail}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-700">
                  {REPORT_REASON_LABELS[r.reason]}
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 text-ink-500" title={r.detail ?? ''}>
                  {r.detail || <span className="text-[#cfd4da]">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_STYLES[r.status],
                    )}
                  >
                    {REPORT_STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {hot ? (
                    <span className="rounded-full bg-danger-bg-strong px-2 py-0.5 text-xs font-semibold text-danger-fg">
                      누적 {r.pendingCountForForm}건
                    </span>
                  ) : (
                    <span className="text-ink-400">{r.pendingCountForForm}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Button variant="secondary" size="sm" onClick={() => onProcess(r)}>
                    처리
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
