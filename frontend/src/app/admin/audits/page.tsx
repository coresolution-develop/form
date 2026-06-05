'use client';

import { useState } from 'react';
import { AuditTable } from '@/components/admin/AuditTable';
import { Pagination } from '@/components/admin/Pagination';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useAdminAudits } from '@/hooks/useAdmin';

const TARGET_FILTERS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'USER', label: '사용자' },
  { value: 'FORM', label: '폼' },
  { value: 'REPORT', label: '신고' },
];

export default function AdminAuditsPage() {
  const [page, setPage] = useState(1);
  const [targetType, setTargetType] = useState('');

  const query = useAdminAudits(page, targetType || null);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>

      <div className="flex flex-wrap items-center gap-2">
        {TARGET_FILTERS.map((t) => (
          <Button
            key={t.value || 'ALL'}
            variant={targetType === t.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setTargetType(t.value);
              setPage(1);
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-20 text-blue-600">
          <Spinner className="h-8 w-8" />
        </div>
      ) : query.isError || !query.data ? (
        <p className="py-20 text-center text-gray-500">감사 로그를 불러올 수 없습니다.</p>
      ) : (
        <>
          <AuditTable audits={query.data.items} />
          <Pagination
            page={query.data.page}
            size={query.data.size}
            total={query.data.total}
            hasNext={query.data.hasNext}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
