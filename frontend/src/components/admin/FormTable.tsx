'use client';

import { StatusBadge } from '@/components/forms/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/datetime';
import type { AdminFormItem } from '@/types/admin';

interface Props {
  forms: AdminFormItem[];
  onForceClose: (form: AdminFormItem) => void;
}

export function FormTable({ forms, onForceClose }: Props) {
  if (forms.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-input py-10 text-center text-sm text-ink-300">
        조건에 맞는 폼이 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line-softer text-sm">
        <thead className="bg-surface-subtle">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-ink-500">제목</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">소유자</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">상태</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">응답</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">신고</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">생성일</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-softer bg-white">
          {forms.map((f) => (
            <tr key={f.id}>
              <td className="max-w-[260px] px-4 py-3">
                <div className="truncate font-medium text-ink-700" title={f.title}>
                  {f.title}
                </div>
                <div className="truncate text-xs text-ink-300">/{f.slug}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-700">{f.ownerEmail}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={f.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">{f.responseCount}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {f.pendingReportCount > 0 ? (
                  <span className="font-medium text-danger-accent">{f.pendingReportCount}</span>
                ) : (
                  <span className="text-[#cfd4da]">0</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formatDate(f.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {f.status === 'PUBLISHED' && (
                    <a
                      href={`/f/${f.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline"
                    >
                      공개 폼
                    </a>
                  )}
                  {f.status === 'CLOSED' ? (
                    <Button variant="ghost" size="sm" disabled>
                      마감됨
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger-accent hover:bg-danger-bg"
                      onClick={() => onForceClose(f)}
                    >
                      강제 마감
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
