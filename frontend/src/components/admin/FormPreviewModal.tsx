'use client';

import { PreviewPanel } from '@/components/builder/PreviewPanel';
import { StatusBadge } from '@/components/forms/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useAdminFormDetail } from '@/hooks/useAdmin';

/** 신고 조사용 폼 미리보기 모달 — 비공개/마감 폼도 admin은 내용 열람 (§10.2). */
export function FormPreviewModal({ formId, onClose }: { formId: number | null; onClose: () => void }) {
  const { data, isLoading, isError } = useAdminFormDetail(formId);

  return (
    <Modal open={formId != null} onClose={onClose} title="폼 미리보기">
      {isLoading ? (
        <div className="flex justify-center py-10 text-brand">
          <Spinner className="h-6 w-6" />
        </div>
      ) : isError || !data ? (
        <p className="py-8 text-center text-sm text-gray-500">폼을 불러올 수 없습니다.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="mb-3 flex items-center gap-2">
            <StatusBadge status={data.status} />
            <span className="text-xs text-gray-400">응답 {data.responseCount}</span>
          </div>
          <PreviewPanel title={data.title} description={data.description} fields={data.fields} />
        </div>
      )}
    </Modal>
  );
}
