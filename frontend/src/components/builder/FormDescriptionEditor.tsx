'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useUpdateForm } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail } from '@/types/form';

/** 빌더 폼 설정: 공개 폼 제목 아래에 노출되는 설명 편집. 포커스 아웃 시 자동 저장(제목과 동일 패턴). */
export function FormDescriptionEditor({ form }: { form: FormDetail }) {
  const { toast } = useToast();
  const updateForm = useUpdateForm(form.id);
  const [value, setValue] = useState(form.description ?? '');

  useEffect(() => setValue(form.description ?? ''), [form.description]);

  const save = () => {
    // 줄바꿈 보존을 위해 원문 그대로 비교/저장(빈 값이면 "" 로 저장 → 표시 안 됨)
    if (value === (form.description ?? '')) return;
    updateForm.mutate(
      { description: value },
      {
        onError: (e: any) => {
          setValue(form.description ?? '');
          toast(toUserMessage(e?.response?.data?.code, '저장 실패'), 'error');
        },
      },
    );
  };

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <label htmlFor="form-description" className="text-sm font-semibold text-ink-700">
        폼 설명
      </label>
      <p className="mt-0.5 text-xs text-ink-300">공개 폼에서 제목 아래에 보이는 안내 문구입니다. (선택)</p>
      <textarea
        id="form-description"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        rows={3}
        placeholder="예: 서비스 이용 경험에 대한 의견을 들려주세요. 약 1분이면 완료됩니다."
        className="mt-3 w-full resize-none rounded-lg border border-line-input px-3 py-2 text-sm leading-relaxed text-ink-900 outline-none focus:border-brand focus:shadow-focus"
      />
    </div>
  );
}
