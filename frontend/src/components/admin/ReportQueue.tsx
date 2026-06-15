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
  PENDING: 'bg-amber-100 text-amber-700',
  REVIEWING: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-gray-200 text-gray-500',
};

/** §10.2 누적 감지 임계: 같은 폼 PENDING 3건 이상이면 우선 처리 강조. */
const ACCUMULATION_THRESHOLD = 3;

export function ReportQueue({ reports, onProcess, onPreview }: Props) {
  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
        조건에 맞는 신고가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">신고일</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">대상 폼</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">사유</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">상세</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">누적</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {reports.map((r) => {
            const hot = r.pendingCountForForm >= ACCUMULATION_THRESHOLD;
            return (
              <tr key={r.id} className={cn(hot && 'bg-red-50/50')}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
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
                    className="block max-w-full truncate text-xs text-gray-400 hover:text-gray-600 hover:underline"
                    title={r.ownerEmail}
                  >
                    소유자: {r.ownerEmail}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {REPORT_REASON_LABELS[r.reason]}
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 text-gray-600" title={r.detail ?? ''}>
                  {r.detail || <span className="text-gray-300">—</span>}
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
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      누적 {r.pendingCountForForm}건
                    </span>
                  ) : (
                    <span className="text-gray-500">{r.pendingCountForForm}</span>
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
