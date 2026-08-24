'use client';

import { formatDateTime } from '@/lib/datetime';
import { ADMIN_ACTION_LABELS, type AdminAuditItem } from '@/types/admin';

interface Props {
  audits: AdminAuditItem[];
  /** 간소 모드: ip 열 숨김 (대시보드 위젯용). */
  compact?: boolean;
}

/** admin_audits.detail(JSON)을 사람이 읽기 쉬운 형태로 (§7.10). */
function formatDetail(detail: Record<string, unknown> | null): string {
  if (!detail || Object.keys(detail).length === 0) return '—';
  return Object.entries(detail)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ');
}

export function AuditTable({ audits, compact }: Props) {
  if (audits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-input py-10 text-center text-sm text-ink-300">
        감사 로그가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line-softer text-sm">
        <thead className="bg-surface-subtle">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink-500">시각</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink-500">관리자</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink-500">작업</th>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink-500">대상</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">상세</th>
            {!compact && (
              <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-ink-500">IP</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-softer bg-white">
          {audits.map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap px-4 py-3 text-ink-400">
                {formatDateTime(a.createdAt)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-700">{a.adminEmail ?? '—'}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="rounded-full bg-surface-fill px-2 py-0.5 text-xs font-medium text-ink-700">
                  {ADMIN_ACTION_LABELS[a.action] ?? a.action}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink-700">
                {a.targetType} #{a.targetId}
              </td>
              <td className="max-w-[360px] truncate px-4 py-3 text-ink-500" title={formatDetail(a.detail)}>
                {formatDetail(a.detail)}
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-4 py-3 text-ink-300">{a.ip ?? '—'}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
