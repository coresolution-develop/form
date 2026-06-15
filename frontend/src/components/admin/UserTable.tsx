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
      <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
        조건에 맞는 사용자가 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">이메일</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">닉네임</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">폼 수</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">최근 로그인</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">가입일</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {users.map((u) => {
            const isAdminRow = u.role === 'ADMIN';
            return (
              <tr key={u.id}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-800">
                  <Link href={`/admin/users/${u.id}`} className="text-brand hover:underline">
                    {u.email}
                  </Link>
                  {isAdminRow && (
                    <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                      관리자
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">{u.nickname}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <UserStatusBadge status={u.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">{u.formCount}</td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {formatDateTime(u.lastLoginAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
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
                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => onSuspend(u)}>
                      정지
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
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
