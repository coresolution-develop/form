'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { downloadResponsesCsv } from '@/lib/responses';
import { toUserMessage } from '@/lib/errorMessage';

export function CsvDownloadButton({ formId, disabled }: { formId: number; disabled?: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await downloadResponsesCsv(formId);
    } catch (e: any) {
      toast(toUserMessage(e?.response?.data?.code, 'CSV 다운로드에 실패했습니다.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={onClick} loading={loading} disabled={disabled}>
      CSV 다운로드
    </Button>
  );
}
