'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusBadge } from '@/components/forms/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useCreateForm, useDeleteForm, useFormList } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormSummary } from '@/types/form';

const FORM_LIMIT = 10;

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFormList(page);
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();
  const [toDelete, setToDelete] = useState<FormSummary | null>(null);

  const total = data?.total ?? 0;
  const atLimit = total >= FORM_LIMIT;

  const onCreate = () => {
    createForm.mutate(
      { title: '제목 없는 폼' },
      {
        onSuccess: (form) => router.push(`/builder/${form.id}`),
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '폼 생성 실패'), 'error'),
      },
    );
  };

  const onDelete = () => {
    if (!toDelete) return;
    deleteForm.mutate(toDelete.id, {
      onSuccess: () => {
        toast('폼을 삭제했습니다.', 'success');
        setToDelete(null);
      },
      onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '삭제 실패'), 'error'),
    });
  };

  const copyUrl = async (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('공개 URL을 복사했습니다.', 'success');
    } catch {
      toast('복사에 실패했습니다.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-ink-900">내 폼</h1>
          <p className="text-[13px] text-ink-400">
            {total}/{FORM_LIMIT}개 사용 중
          </p>
        </div>
        <Button
          className="h-[38px] text-[13.5px]"
          onClick={onCreate}
          loading={createForm.isPending}
          disabled={atLimit}
        >
          + 새 폼 만들기
        </Button>
      </div>

      {atLimit && (
        <p className="mb-4 rounded-lg bg-warn-bg px-4 py-2 text-sm text-warn-fg">
          무료 플랜에서는 폼을 {FORM_LIMIT}개까지 만들 수 있습니다. 새 폼을 만들려면 기존 폼을 삭제해주세요.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20 text-brand">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-input py-9 text-center">
          <p className="text-[13.5px] text-ink-400">아직 만든 폼이 없습니다.</p>
          <p className="mt-1 text-[12.5px] text-ink-200">‘새 폼 만들기’를 눌러 첫 폼을 만들어보세요.</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((form) => (
              <li
                key={form.id}
                className="flex flex-col rounded-[10px] border border-line bg-white p-4 transition-colors hover:border-line-input"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <StatusBadge status={form.status} />
                  <span className="text-[11.5px] text-ink-300">{form.createdAt?.slice(0, 10)}</span>
                </div>
                <h2 className="mb-1 line-clamp-2 text-[15px] font-semibold leading-[1.35] tracking-[-0.3px] text-ink-900">
                  {form.title}
                </h2>
                <p className="text-[12.5px] tabular-nums text-ink-400">
                  응답 {form.responseCount}
                  {form.responseLimit ? ` / ${form.responseLimit}` : ''}
                </p>
                {form.responseLimit ? (
                  <div className="mb-4 mt-2 h-1 overflow-hidden rounded-full bg-line-soft" aria-hidden>
                    <div
                      className={`h-full rounded-full ${form.status === 'CLOSED' ? 'bg-[#cfd4da]' : 'bg-brand'}`}
                      style={{
                        width: `${Math.min(100, (form.responseCount / form.responseLimit) * 100)}%`,
                      }}
                    />
                  </div>
                ) : (
                  <div className="mb-4" />
                )}
                {form.status === 'PUBLISHED' && (
                  <button
                    type="button"
                    onClick={() => copyUrl(form.slug)}
                    className="mt-auto mb-2 rounded-[7px] bg-brand-light px-3 py-[7px] text-center text-[12.5px] font-medium text-brand-dark hover:bg-brand-light/70"
                  >
                    URL 복사
                  </button>
                )}
                <div className={`${form.status === 'PUBLISHED' ? '' : 'mt-auto '}flex gap-2`}>
                  <Link
                    href={`/builder/${form.id}`}
                    className="flex-1 rounded-[7px] bg-surface-fill px-3 py-[7px] text-center text-[12.5px] text-ink-700 hover:bg-surface-fill-hover"
                  >
                    편집
                  </Link>
                  <Link
                    href={`/forms/${form.id}/responses`}
                    className="flex-1 rounded-[7px] bg-surface-fill px-3 py-[7px] text-center text-[12.5px] text-ink-700 hover:bg-surface-fill-hover"
                  >
                    응답보기
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(form)}>
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {(page > 1 || data.hasNext) && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <span className="text-sm text-ink-400">{page}</span>
              <Button variant="secondary" size="sm" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>
                다음
              </Button>
            </div>
          )}
        </>
      )}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="폼 삭제">
        <p className="text-sm text-ink-500">
          ‘{toDelete?.title}’ 폼을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setToDelete(null)}>
            취소
          </Button>
          <Button onClick={onDelete} loading={deleteForm.isPending}>
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
