'use client';

import { useState, type FormEvent } from 'react';
import { FormTable } from '@/components/admin/FormTable';
import { Pagination } from '@/components/admin/Pagination';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useAdminForms, useForceCloseForm } from '@/hooks/useAdmin';
import { toUserMessage } from '@/lib/errorMessage';
import type { AdminFormItem } from '@/types/admin';

export default function AdminFormsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');

  const [closeTarget, setCloseTarget] = useState<AdminFormItem | null>(null);
  const [reason, setReason] = useState('');

  const query = useAdminForms(page, keyword);
  const mutation = useForceCloseForm();

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setKeyword(keywordInput.trim());
    setPage(1);
  };

  const confirmClose = () => {
    if (!closeTarget) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast('마감 사유를 입력하세요.', 'error');
      return;
    }
    mutation.mutate(
      { id: closeTarget.id, reason: trimmed },
      {
        onSuccess: () => {
          toast(`'${closeTarget.title}' 폼을 강제 마감했습니다.`, 'success');
          setCloseTarget(null);
          setReason('');
        },
        onError: (e: any) =>
          toast(toUserMessage(e?.response?.data?.code, '강제 마감에 실패했습니다.'), 'error'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">폼 관리</h1>

      <form onSubmit={onSearch} className="flex items-center gap-2">
        <Input
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          placeholder="slug · 제목 · 소유자 이메일 검색"
          className="w-72"
        />
        <Button type="submit" variant="secondary" size="md">
          검색
        </Button>
      </form>

      {query.isLoading ? (
        <div className="flex justify-center py-20 text-blue-600">
          <Spinner className="h-8 w-8" />
        </div>
      ) : query.isError || !query.data ? (
        <p className="py-20 text-center text-gray-500">폼 목록을 불러올 수 없습니다.</p>
      ) : (
        <>
          <FormTable forms={query.data.items} onForceClose={(f) => { setReason(''); setCloseTarget(f); }} />
          <Pagination
            page={query.data.page}
            size={query.data.size}
            total={query.data.total}
            hasNext={query.data.hasNext}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title="폼 강제 마감">
        <p className="text-sm text-gray-600">
          <strong>{closeTarget?.title}</strong> 폼을 마감합니다. 소유자에게 메일로 통보되며 마감 후 응답을 받지 않습니다.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="마감 사유"
          rows={3}
          className="mt-3"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCloseTarget(null)}>
            취소
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={confirmClose}
            loading={mutation.isPending}
          >
            강제 마감
          </Button>
        </div>
      </Modal>
    </div>
  );
}
