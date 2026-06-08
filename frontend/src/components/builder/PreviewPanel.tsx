'use client';

import { FieldRenderer } from '@/components/form/FieldRenderer';
import type { FormField } from '@/types/field';

interface Props {
  title: string;
  description: string | null;
  fields: FormField[];
}

/** 응답자 관점 미리보기 (로컬 상태만, API 호출 없음). 모든 입력은 disabled. */
export function PreviewPanel({ title, description, fields }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      <div className="mt-6 flex flex-col gap-5">
        {fields.length === 0 ? (
          <p className="text-sm text-gray-400">필드가 없습니다.</p>
        ) : (
          fields.map((f) => <FieldRenderer key={f.id} field={f} disabled />)
        )}
      </div>
      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-lg bg-brand/40 py-2.5 text-sm font-medium text-white"
      >
        제출 (미리보기)
      </button>
    </div>
  );
}
