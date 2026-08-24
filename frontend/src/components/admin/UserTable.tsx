'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UserStatusBadge } from '@/components/admin/UserStatusBadge';
import { formatDate, formatDateTime } from '@/lib/datetime';
import type { AdminUserItem } from '@/types/admin';

interface Props {
  users: AdminUserItem[];
  onSuspend: (user: AdminUserItem) => void;
  onRestore: (user: AdminUserItem) => void;
}

export function UserTable({ users, onSuspend, onRestore }: Props) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-input py-10 text-center text-sm text-ink-300">
        조건에 맞는 사용자가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="min-w-full divide-y divide-line-softer text-sm">
        <thead className="bg-surface-subtle">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-ink-500">이메일</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">닉네임</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">상태</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">폼 수</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">최근 로그인</th>
            <th className="px-4 py-3 text-left font-medium text-ink-500">가입일</th>
            <th className="px-4 py-3 text-right font-medium text-ink-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-softer bg-white">
          {users.map((u) => {
            const isAdminRow = u.role === 'ADMIN';
            return (
              <tr key={u.id}>
                <td className="whitespace-nowrap px-4 py-3 text-ink-700">
                  <Link href={`/admin/users/${u.id}`} className="text-brand hover:underline">
                    {u.email}
                  </Link>
                  {isAdminRow && (
                    <span className="ml-2 rounded bg-admin-bg px-1.5 py-0.5 text-xs font-medium text-admin-fg">
                      관리자
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-700">{u.nickname}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <UserStatusBadge status={u.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-ink-700">{u.formCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">
                  {formatDateTime(u.lastLoginAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-400">{formatDate(u.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {isAdminRow ? (
                    <Button variant="ghost" size="sm" disabled title="관리자 계정은 변경할 수 없습니다.">
                      변경 불가
                    </Button>
                  ) : u.status === 'SUSPENDED' ? (
                    <Button variant="secondary" size="sm" onClick={() => onRestore(u)}>
                      복원
                    </Button>
                  ) : u.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" className="text-danger-accent hover:bg-danger-bg" onClick={() => onSuspend(u)}>
                      정지
                    </Button>
                  ) : (
                    <span className="text-xs text-[#cfd4da]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
