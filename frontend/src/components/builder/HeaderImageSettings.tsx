'use client';

import { useRef, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteHeaderImage,
  useDeleteLogoImage,
  useUploadHeaderImage,
  useUploadLogoImage,
} from '@/hooks/useForms';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail } from '@/types/form';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_BYTES = 2 * 1024 * 1024;

interface SlotProps {
  title: string;
  hint: string;
  /** BANNER=전체폭 미리보기, LOGO=중앙 소형 미리보기. */
  variant: 'BANNER' | 'LOGO';
  url: string | null;
  uploading: boolean;
  removing: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** 이미지 슬롯 1개(배너 또는 로고). 선택 → 검증 → 상위로 위임. */
function ImageSlot({ title, hint, variant, url, uploading, removing, onPick, onRemove }: SlotProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast('PNG, JPG, WebP, GIF 이미지만 올릴 수 있어요.', 'error');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast('이미지는 2MB 이하만 올릴 수 있어요.', 'error');
      return;
    }
    onPick(file);
  };

  return (
    <div className="rounded-lg border border-line p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-ink-700">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-300">{hint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
            {url ? '변경' : '추가'}
          </Button>
          {url && (
            <Button variant="ghost" size="sm" onClick={onRemove} loading={removing}>
              제거
            </Button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT.join(',')} onChange={onFile} className="hidden" aria-hidden />

      {url && (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface-subtle">
          {variant === 'BANNER' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveAssetUrl(url)} alt={`${title} 미리보기`} className="h-auto w-full" />
          ) : (
            <div className="flex justify-center py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAssetUrl(url)} alt={`${title} 미리보기`} className="max-h-14 w-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 빌더 폼 설정: 공개 폼 상단 배너·로고 업로드/제거. 두 슬롯은 서로 독립이라 함께 쓸 수 있다. */
export function HeaderImageSettings({ form }: { form: FormDetail }) {
  const { toast } = useToast();
  const uploadBanner = useUploadHeaderImage(form.id);
  const removeBanner = useDeleteHeaderImage(form.id);
  const uploadLogo = useUploadLogoImage(form.id);
  const removeLogo = useDeleteLogoImage(form.id);

  const done = (msg: string) => ({
    onSuccess: () => toast(msg, 'success'),
    onError: (err: any) => toast(toUserMessage(err?.response?.data?.code, '실패했어요.'), 'error'),
  });

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h2 className="text-sm font-semibold text-ink-700">헤더 이미지</h2>
      <p className="mt-0.5 text-xs text-ink-300">
        공개 폼 상단에 표시됩니다. 배너와 로고를 함께 쓸 수 있어요. PNG·JPG·WebP·GIF, 각 2MB 이하.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <ImageSlot
          title="배너"
          hint="폼 맨 위에 전체폭으로 크게"
          variant="BANNER"
          url={form.headerImageUrl}
          uploading={uploadBanner.isPending}
          removing={removeBanner.isPending}
          onPick={(file) => uploadBanner.mutate(file, done('배너를 저장했어요.'))}
          onRemove={() => removeBanner.mutate(undefined, done('배너를 제거했어요.'))}
        />
        <ImageSlot
          title="로고"
          hint="폼 제목 위에 중앙 정렬로 작게"
          variant="LOGO"
          url={form.logoImageUrl}
          uploading={uploadLogo.isPending}
          removing={removeLogo.isPending}
          onPick={(file) => uploadLogo.mutate(file, done('로고를 저장했어요.'))}
          onRemove={() => removeLogo.mutate(undefined, done('로고를 제거했어요.'))}
        />
      </div>
    </div>
  );
}
