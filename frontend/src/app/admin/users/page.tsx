'use client';

import { useState, type FormEvent } from 'react';
import { Pagination } from '@/components/admin/Pagination';
import { UserTable } from '@/components/admin/UserTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useAdminUsers, useUpdateUserStatus } from '@/hooks/useAdmin';
import { toUserMessage } from '@/lib/errorMessage';
import { USER_STATUS_LABELS, type AdminUserItem } from '@/types/admin';
import type { UserStatus } from '@/types/user';

const STATUS_OPTIONS: (UserStatus | '')[] = ['', 'ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED'];

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [emailInput, setEmailInput] = useState('');
  const [appliedEmail, setAppliedEmail] = useState('');

  const [suspendTarget, setSuspendTarget] = useState<AdminUserItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminUserItem | null>(null);
  const [reason, setReason] = useState('');

  const query = useAdminUsers(page, { status: status || null, email: appliedEmail || null });
  const mutation = useUpdateUserStatus();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setAppliedEmail(emailInput.trim());
    setPage(1);
  };

  const onStatusChange = (v: UserStatus | '') => {
    setStatus(v);
    setPage(1);
  };

  const confirmSuspend = () => {
    if (!suspendTarget) return;
    mutation.mutate(
      { id: suspendTarget.id, status: 'SUSPENDED', reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast(`${suspendTarget.email} 계정을 정지했습니다.`, 'success');
          setSuspendTarget(null);
          setReason('');
        },
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '정지에 실패했습니다.'), 'error'),
      },
    );
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    mutation.mutate(
      { id: restoreTarget.id, status: 'ACTIVE' },
      {
        onSuccess: () => {
          toast(`${restoreTarget.email} 계정을 복원했습니다.`, 'success');
          setRestoreTarget(null);
        },
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '복원에 실패했습니다.'), 'error'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as UserStatus | '')}
          aria-label="상태 필터"
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? '전체 상태' : USER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <form onSubmit={onSearch} className="flex items-center gap-2">
          <Input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="이메일 검색"
            className="w-56"
          />
          <Button type="submit" variant="secondary" size="md">
            검색
          </Button>
        </form>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-20 text-brand">
          <Spinner className="h-8 w-8" />
        </div>
      ) : query.isError || !query.data ? (
        <p className="py-20 text-center text-gray-500">사용자 목록을 불러올 수 없습니다.</p>
      ) : (
        <>
          <UserTable
            users={query.data.items}
            onSuspend={(u) => {
              setReason('');
              setSuspendTarget(u);
            }}
            onRestore={(u) => setRestoreTarget(u)}
          />
          <Pagination
            page={query.data.page}
            size={query.data.size}
            total={query.data.total}
            hasNext={query.data.hasNext}
            onPageChange={setPage}
          />
        </>
      )}

      {/* 정지 Modal */}
      <Modal open={!!suspendTarget} onClose={() => setSuspendTarget(null)} title="계정 정지">
        <p className="text-sm text-gray-600">
          <strong>{suspendTarget?.email}</strong> 계정을 정지합니다. 사유를 입력하세요 (사용자에게 메일로 통보됩니다).
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="정지 사유"
          rows={3}
          className="mt-3"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSuspendTarget(null)}>
            취소
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={confirmSuspend}
            loading={mutation.isPending}
          >
            정지
          </Button>
        </div>
      </Modal>

      {/* 복원 Modal */}
      <Modal open={!!restoreTarget} onClose={() => setRestoreTarget(null)} title="계정 복원">
        <p className="text-sm text-gray-600">
          <strong>{restoreTarget?.email}</strong> 계정을 다시 활성화합니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRestoreTarget(null)}>
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
