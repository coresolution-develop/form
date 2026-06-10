'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CsvDownloadButton } from '@/components/responses/CsvDownloadButton';
import { ResponseTable } from '@/components/responses/ResponseTable';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useForm } from '@/hooks/useForms';
import { useResponseList } from '@/hooks/useResponses';

export default function ResponsesPage() {
  const params = useParams();
  const formId = Number(params.formId);
  const [page, setPage] = useState(1);

  const formQuery = useForm(formId);
  const listQuery = useResponseList(formId, page);

  if (formQuery.isLoading || listQuery.isLoading) {
    return (
      <div className="flex justify-center py-20 text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (formQuery.isError || listQuery.isError) {
    const status =
      (formQuery.error as any)?.response?.status ?? (listQuery.error as any)?.response?.status;
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-gray-600">
          {status === 403 ? '이 폼의 응답을 볼 권한이 없습니다.' : '응답을 불러올 수 없습니다.'}
        </p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-brand hover:underline">
          대시보드로
        </Link>
      </div>
    );
  }

  const form = formQuery.data;
  const data = listQuery.data;
  if (!form || !data) {
    return <p className="py-20 text-center text-gray-500">응답을 불러올 수 없습니다.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            ← 대시보드
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{form.title}</h1>
          <p className="text-sm text-gray-500">총 {data.total}개 응답</p>
        </div>
        <div className="flex items-center gap-2">
          <CsvDownloadButton formId={formId} disabled={data.total === 0} />
          <Link
            href={`/forms/${formId}/stats`}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-800 hover:bg-gray-200"
          >
            통계 보기
          </Link>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-500">아직 응답이 없습니다.</p>
          <p className="mt-1 text-sm text-gray-400">
            공개 URL을 공유해 응답을 받아보세요: <span className="text-gray-500">{form.publicUrl}</span>
          </p>
        </div>
      ) : (
        <>
          <ResponseTable fields={form.fields} responses={data.items} />
          {(page > 1 || data.hasNext) && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                이전
              </Button>
              <span className="text-sm text-gray-500">{page}</span>
              <Button variant="secondary" size="sm" disabled={!data.hasNext} onClick={() => setPage((p) => p + 1)}>
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
