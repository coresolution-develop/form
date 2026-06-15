'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/forms/StatusBadge';
import { UserStatusBadge } from '@/components/admin/UserStatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useAdminUserDetail, useUpdateUserStatus } from '@/hooks/useAdmin';
import { formatDate, formatDateTime } from '@/lib/datetime';
import { toUserMessage } from '@/lib/errorMessage';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = Number(params.id);
  const { toast } = useToast();

  const { data, isLoading, isError } = useAdminUserDetail(userId);
  const mutation = useUpdateUserStatus();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">사용자를 불러올 수 없습니다.</p>
        <Link href="/admin/users" className="mt-3 inline-block text-sm text-brand hover:underline">
          사용자 목록으로
        </Link>
      </div>
    );
  }

  const isAdminRow = data.role === 'ADMIN';

  const confirmSuspend = () => {
    mutation.mutate(
      { id: data.id, status: 'SUSPENDED', reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast(`${data.email} 계정을 정지했습니다.`, 'success');
          setSuspendOpen(false);
          setReason('');
        },
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '정지에 실패했습니다.'), 'error'),
      },
    );
  };

  const confirmRestore = () => {
    mutation.mutate(
      { id: data.id, status: 'ACTIVE' },
      {
        onSuccess: () => {
          toast(`${data.email} 계정을 복원했습니다.`, 'success');
          setRestoreOpen(false);
        },
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '복원에 실패했습니다.'), 'error'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-800">
          ← 사용자 목록
        </Link>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.nickname}</h1>
            <p className="text-sm text-gray-500">{data.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdminRow ? (
              <Button variant="ghost" size="sm" disabled title="관리자 계정은 변경할 수 없습니다.">
                변경 불가
              </Button>
            ) : data.status === 'SUSPENDED' ? (
              <Button variant="secondary" size="sm" onClick={() => setRestoreOpen(true)}>
                복원
              </Button>
            ) : data.status === 'ACTIVE' ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => {
                  setReason('');
                  setSuspendOpen(true);
                }}
              >
                정지
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="상태">
            <UserStatusBadge status={data.status} />
            {isAdminRow && (
              <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                관리자
              </span>
            )}
          </Field>
          <Field label="플랜">{data.plan ?? '—'}</Field>
          <Field label="가입일">{formatDate(data.createdAt)}</Field>
          <Field label="최근 로그인">{formatDateTime(data.lastLoginAt)}</Field>
          <Field label="이메일 인증">{data.emailVerifiedAt ? formatDateTime(data.emailVerifiedAt) : '미인증'}</Field>
          <Field label="보유 폼 / 총 응답">
            {data.formCount} / {data.totalResponses}
          </Field>
        </dl>
        {data.status === 'SUSPENDED' && data.suspendedReason && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            정지 사유: {data.suspendedReason}
          </p>
        )}
      </section>

      {/* 보유 폼 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">보유 폼 ({data.formCount})</h2>
        {data.forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-400">
            만든 폼이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">제목</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">응답</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">생성일</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">공개 폼</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {data.forms.map((f) => (
                  <tr key={f.id}>
                    <td className="max-w-[280px] px-4 py-3">
                      <div className="truncate font-medium text-gray-800" title={f.title}>
                        {f.title}
                      </div>
                      <div className="truncate text-xs text-gray-400">/{f.slug}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {f.responseCount}
                      {f.responseLimit ? ` / ${f.responseLimit}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(f.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {f.status === 'PUBLISHED' ? (
                        <a
                          href={`/f/${f.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand hover:underline"
                        >
                          열기
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 정지 Modal */}
      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title="계정 정지">
        <p className="text-sm text-gray-600">
          <strong>{data.email}</strong> 계정을 정지합니다. 사유를 입력하세요 (사용자에게 메일로 통보됩니다).
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="정지 사유"
          rows={3}
          className="mt-3"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSuspendOpen(false)}>
            취소
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={confirmSuspend} loading={mutation.isPending}>
            정지
          </Button>
        </div>
      </Modal>

      {/* 복원 Modal */}
      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)} title="계정 복원">
        <p className="text-sm text-gray-600">
          <strong>{data.email}</strong> 계정을 다시 활성화합니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRestoreOpen(false)}>
            취소
          </Button>
          <Button onClick={confirmRestore} loading={mutation.isPending}>
            복원
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-gray-800">{children}</dd>
    </div>
  );
}
