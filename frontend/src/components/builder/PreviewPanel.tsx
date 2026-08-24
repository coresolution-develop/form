'use client';

import { FieldRenderer } from '@/components/form/FieldRenderer';
import { resolveAssetUrl } from '@/lib/assetUrl';
import type { FormField } from '@/types/field';

interface Props {
  title: string;
  description: string | null;
  fields: FormField[];
  headerImageUrl?: string | null;
  logoImageUrl?: string | null;
}

/** 응답자 관점 미리보기 (로컬 상태만, API 호출 없음). 모든 입력은 disabled. */
export function PreviewPanel({ title, description, fields, headerImageUrl, logoImageUrl }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className={headerImageUrl ? 'p-6' : 'p-6 pb-0'}>
        {logoImageUrl && (
          <div className="mb-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAssetUrl(logoImageUrl)} alt="" className="max-h-14 w-auto" />
          </div>
        )}
        <h2 className="break-words text-xl font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">{description}</p>
        )}
      </div>
      {headerImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolveAssetUrl(headerImageUrl)} alt="" className="h-auto w-full" />
      )}
      <div className="p-6">
        <div className="flex flex-col gap-5">
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
    </div>
  );
}
