'use client';

import { useRef, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useDeleteHeaderImage, useUpdateForm, useUploadHeaderImage } from '@/hooks/useForms';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { cn } from '@/lib/cn';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail, HeaderImageStyle } from '@/types/form';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

/** 빌더 폼 설정: 공개 폼 상단 헤더 이미지(로고/배너) 업로드·스타일·제거. */
export function HeaderImageSettings({ form }: { form: FormDetail }) {
  const { toast } = useToast();
  const upload = useUploadHeaderImage(form.id);
  const remove = useDeleteHeaderImage(form.id);
  const updateForm = useUpdateForm(form.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasImage = !!form.headerImageUrl;
  const style: HeaderImageStyle = form.headerImageStyle ?? 'LOGO';

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast('PNG, JPG, WebP 이미지만 올릴 수 있어요.', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('이미지는 2MB 이하만 올릴 수 있어요.', 'error');
      return;
    }
    upload.mutate(
      { file, style: form.headerImageStyle ?? undefined },
      {
        onSuccess: () => toast('헤더 이미지를 저장했어요.', 'success'),
        onError: (err: any) => toast(toUserMessage(err?.response?.data?.code, '업로드 실패'), 'error'),
      },
    );
  };

  const setStyle = (s: HeaderImageStyle) => {
    if (s === style) return;
    updateForm.mutate(
      { headerImageStyle: s },
      { onError: (err: any) => toast(toUserMessage(err?.response?.data?.code, '변경 실패'), 'error') },
    );
  };

  const onRemove = () =>
    remove.mutate(undefined, {
      onSuccess: () => toast('헤더 이미지를 제거했어요.', 'success'),
      onError: (err: any) => toast(toUserMessage(err?.response?.data?.code, '제거 실패'), 'error'),
    });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">헤더 이미지</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            공개 폼 상단에 로고나 배너를 표시합니다. PNG·JPG·WebP, 2MB 이하.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            {hasImage ? '이미지 변경' : '이미지 추가'}
          </Button>
          {hasImage && (
            <Button variant="ghost" size="sm" onClick={onRemove} loading={remove.isPending}>
              제거
            </Button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT.join(',')} onChange={onFile} className="hidden" aria-hidden />

      {hasImage && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">표시 방식</span>
            <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
              {(['LOGO', 'BANNER'] as HeaderImageStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    'px-3 py-1 text-xs transition-colors',
                    style === s ? 'bg-brand text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {s === 'LOGO' ? '로고 (중앙 소형)' : '배너 (전체폭)'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {style === 'BANNER' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveAssetUrl(form.headerImageUrl)} alt="헤더 배너 미리보기" className="max-h-40 w-full object-cover" />
            ) : (
              <div className="flex justify-center py-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveAssetUrl(form.headerImageUrl)} alt="헤더 로고 미리보기" className="max-h-14 w-auto" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
