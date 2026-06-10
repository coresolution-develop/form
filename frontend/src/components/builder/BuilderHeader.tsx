'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/forms/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useUpdateClosesAt, useUpdateForm, useUpdateFormStatus } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail } from '@/types/form';

/** datetime-local 입력용 'YYYY-MM-DDTHH:mm' (로컬). */
function toLocalInput(iso: string | null): string {
  return iso ? iso.slice(0, 16) : '';
}

interface Props {
  form: FormDetail;
  previewMode: boolean;
  onTogglePreview: () => void;
}

export function BuilderHeader({ form, previewMode, onTogglePreview }: Props) {
  const { toast } = useToast();
  const updateForm = useUpdateForm(form.id);
  const updateStatus = useUpdateFormStatus(form.id);
  const updateClosesAt = useUpdateClosesAt(form.id);
  const [title, setTitle] = useState(form.title);
  const [closesAt, setClosesAt] = useState(toLocalInput(form.closesAt));

  useEffect(() => setTitle(form.title), [form.title]);
  useEffect(() => setClosesAt(toLocalInput(form.closesAt)), [form.closesAt]);

  const saveClosesAt = (value: string) => {
    setClosesAt(value);
    if (!value) {
      updateClosesAt.mutate(null, {
        onSuccess: () => toast('마감 예정일을 해제했습니다.', 'success'),
        onError: (e: any) => {
          setClosesAt(toLocalInput(form.closesAt));
          toast(toUserMessage(e?.response?.data?.code, '마감일 변경 실패'), 'error');
        },
      });
      return;
    }
    if (new Date(value).getTime() <= Date.now()) {
      setClosesAt(toLocalInput(form.closesAt));
      toast('마감 예정 시각은 현재보다 미래여야 합니다.', 'error');
      return;
    }
    updateClosesAt.mutate(value, {
      onSuccess: () => toast('마감 예정일을 설정했습니다.', 'success'),
      onError: (e: any) => {
        setClosesAt(toLocalInput(form.closesAt));
        toast(toUserMessage(e?.response?.data?.code, '마감일 변경 실패'), 'error');
      },
    });
  };

  const saveTitle = () => {
    const t = title.trim();
    if (!t) {
      setTitle(form.title);
      toast('제목을 입력해주세요.', 'error');
      return;
    }
    if (t === form.title) return;
    updateForm.mutate({ title: t }, { onError: (e: any) => toast(toUserMessage(e?.response?.data?.code), 'error') });
  };

  const changeStatus = (status: 'PUBLISHED' | 'CLOSED') => {
    if (status === 'PUBLISHED' && form.fields.length === 0) {
      toast('최소 1개 이상의 필드가 필요합니다.', 'error');
      return;
    }
    updateStatus.mutate(
      { status },
      {
        onSuccess: () => toast(status === 'PUBLISHED' ? '폼을 발행했습니다.' : '폼을 마감했습니다.', 'success'),
        onError: (e: any) => toast(toUserMessage(e?.response?.data?.code, '상태 변경 실패'), 'error'),
      },
    );
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(form.publicUrl);
      toast('공개 URL을 복사했습니다.', 'success');
    } catch {
      toast('복사에 실패했습니다.', 'error');
    }
  };

  const canPublish = form.fields.length > 0;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← 대시보드
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          aria-label="폼 제목"
          className="rounded border border-transparent px-2 py-1 text-lg font-semibold text-gray-900 hover:border-gray-200 focus:border-brand focus:outline-none"
        />
        <StatusBadge status={form.status} />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          마감 예정
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => saveClosesAt(e.target.value)}
            aria-label="마감 예정 시각 (비우면 무기한)"
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <Button variant={previewMode ? 'primary' : 'secondary'} size="sm" onClick={onTogglePreview}>
          {previewMode ? '편집으로' : '미리보기'}
        </Button>

        {form.status === 'PUBLISHED' && (
          <Button variant="secondary" size="sm" onClick={copyUrl}>
            URL 복사
          </Button>
        )}

        {form.status === 'PUBLISHED' ? (
          <Button variant="secondary" size="sm" onClick={() => changeStatus('CLOSED')} loading={updateStatus.isPending}>
            마감
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => changeStatus('PUBLISHED')}
            loading={updateStatus.isPending}
            disabled={!canPublish}
            title={canPublish ? undefined : '필드를 1개 이상 추가해주세요.'}
          >
            {form.status === 'CLOSED' ? '다시 발행' : '발행'}
          </Button>
        )}
      </div>
    </header>
  );
}
