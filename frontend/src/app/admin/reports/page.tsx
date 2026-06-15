'use client';

import { useState } from 'react';
import { FormPreviewModal } from '@/components/admin/FormPreviewModal';
import { Pagination } from '@/components/admin/Pagination';
import { ReportQueue } from '@/components/admin/ReportQueue';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { useAdminReports, useUpdateReport } from '@/hooks/useAdmin';
import { toUserMessage } from '@/lib/errorMessage';
import {
  REPORT_STATUS_LABELS,
  type AdminReportItem,
  type ReportStatus,
} from '@/types/admin';

const STATUS_FILTERS: (ReportStatus | '')[] = ['', 'PENDING', 'REVIEWING', 'RESOLVED', 'REJECTED'];
const PROCESS_OPTIONS: ReportStatus[] = ['REVIEWING', 'RESOLVED', 'REJECTED'];

export default function AdminReportsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  // 기본은 PENDING 우선 큐
  const [status, setStatus] = useState<ReportStatus | ''>('PENDING');

  const [target, setTarget] = useState<AdminReportItem | null>(null);
  const [nextStatus, setNextStatus] = useState<ReportStatus>('RESOLVED');
  const [detail, setDetail] = useState('');
  const [closeForm, setCloseForm] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const query = useAdminReports(page, status || null);
  const mutation = useUpdateReport();

  const openProcess = (r: AdminReportItem) => {
    setTarget(r);
    setNextStatus('RESOLVED');
    setDetail('');
    setCloseForm(false);
  };

  const alreadyClosed = target?.formStatus === 'CLOSED';

  const confirmProcess = () => {
    if (!target) return;
    mutation.mutate(
      { id: target.id, status: nextStatus, detail: detail.trim() || undefined, closeForm: closeForm && !alreadyClosed },
      {
        onSuccess: () => {
          toast(
            closeForm && !alreadyClosed
              ? `신고를 처리하고 대상 폼을 강제 마감했습니다.`
              : `신고를 '${REPORT_STATUS_LABELS[nextStatus]}'(으)로 처리했습니다.`,
            'success',
          );
          setTarget(null);
        },
        onError: (e: any) =>
          toast(toUserMessage(e?.response?.data?.code, '신고 처리에 실패했습니다.'), 'error'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">신고 처리</h1>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s || 'ALL'}
            variant={status === s ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {s === '' ? '전체' : REPORT_STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-20 text-brand">
          <Spinner className="h-8 w-8" />
        </div>
      ) : query.isError || !query.data ? (
        <p className="py-20 text-center text-gray-500">신고 목록을 불러올 수 없습니다.</p>
      ) : (
        <>
          <ReportQueue reports={query.data.items} onProcess={openProcess} onPreview={(r) => setPreviewId(r.formId)} />
          <Pagination
            page={query.data.page}
            size={query.data.size}
            total={query.data.total}
            hasNext={query.data.hasNext}
            onPageChange={setPage}
          />
        </>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title="신고 처리">
        {target && (
          <p className="text-sm text-gray-600">
            대상 폼: <strong>{target.formTitle}</strong>
          </p>
        )}
        <label className="mt-4 block text-sm font-medium text-gray-800">처리 상태</label>
        <select
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
          className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand focus:outline-none"
        >
          {PROCESS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {REPORT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="처리 내용 (선택)"
          rows={3}
          className="mt-3"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={closeForm}
            disabled={alreadyClosed}
            onChange={(e) => setCloseForm(e.target.checked)}
            className="h-4 w-4 rounded accent-brand"
          />
          {alreadyClosed ? '대상 폼이 이미 마감됨' : '이 폼도 함께 강제 마감 (소유자에게 메일 통보)'}
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            취소
          </Button>
          <Button onClick={confirmProcess} loading={mutation.isPending}>
            처리
          </Button>
        </div>
      </Modal>

      <FormPreviewModal formId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
