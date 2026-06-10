'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MultiChoiceChart } from '@/components/stats/MultiChoiceChart';
import { SingleChoiceChart } from '@/components/stats/SingleChoiceChart';
import { TextSamples } from '@/components/stats/TextSamples';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useForm } from '@/hooks/useForms';
import { useStats } from '@/hooks/useStats';
import { downloadStatsCsv } from '@/lib/responses';
import { FIELD_TYPE_LABELS, type FieldType } from '@/types/field';

export default function StatsPage() {
  const params = useParams();
  const formId = Number(params.formId);

  const formQuery = useForm(formId);
  const statsQuery = useStats(formId);

  if (formQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="flex justify-center py-20 text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (formQuery.isError || statsQuery.isError) {
    const status =
      (formQuery.error as any)?.response?.status ?? (statsQuery.error as any)?.response?.status;
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-gray-600">
          {status === 403 ? '이 폼의 통계를 볼 권한이 없습니다.' : '통계를 불러올 수 없습니다.'}
        </p>
        <Link href="/dashboard" className="mt-3 inline-block text-sm text-brand hover:underline">
          대시보드로
        </Link>
      </div>
    );
  }

  const form = formQuery.data;
  const stats = statsQuery.data;
  if (!form || !stats) {
    return <p className="py-20 text-center text-gray-500">통계를 불러올 수 없습니다.</p>;
  }

  const hasChartData = stats.fields.some((f) => f.distribution && f.distribution.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href={`/forms/${formId}/responses`} className="text-sm text-gray-500 hover:text-gray-800">
            ← 응답 목록
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{form.title} · 통계</h1>
          <p className="text-sm text-gray-500">총 {stats.totalResponses}개 응답</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasChartData}
          onClick={() => downloadStatsCsv(stats, form.title)}
        >
          CSV 다운로드
        </Button>
      </div>

      {stats.totalResponses === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-gray-500">응답이 모이면 통계가 표시됩니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {stats.fields.map((f) => (
            <section key={f.fieldId} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">{f.label}</h2>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {FIELD_TYPE_LABELS[f.type as FieldType] ?? f.type}
                </span>
              </div>
              {f.type === 'SINGLE' && f.distribution && <SingleChoiceChart distribution={f.distribution} />}
              {f.type === 'MULTI' && f.distribution && <MultiChoiceChart distribution={f.distribution} />}
              {!['SINGLE', 'MULTI'].includes(f.type) && <TextSamples samples={f.sampleAnswers ?? []} />}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
