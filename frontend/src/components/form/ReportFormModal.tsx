'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { reportPublicForm } from '@/lib/publicForm';
import { toUserMessage } from '@/lib/errorMessage';

const REASONS: { value: string; label: string }[] = [
  { value: 'SPAM', label: '스팸' },
  { value: 'PHISHING', label: '피싱/사기' },
  { value: 'ILLEGAL', label: '불법 정보' },
  { value: 'PRIVACY', label: '개인정보 침해' },
  { value: 'OTHER', label: '기타' },
];

export function ReportFormModal({
  slug,
  open,
  onClose,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('SPAM');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await reportPublicForm(slug, reason, detail);
      toast('신고가 접수되었습니다.', 'success');
      setDetail('');
      onClose();
    } catch (e: any) {
      toast(toUserMessage(e?.response?.data?.code, '신고에 실패했습니다.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="폼 신고">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-800">신고 사유</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <Textarea
          label="상세 내용 (선택)"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="신고 사유를 자세히 적어주세요."
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={onSubmit} loading={submitting}>
            신고하기
          </Button>
        </div>
      </div>
    </Modal>
  );
}
