'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MultiChoiceChart } from '@/components/stats/MultiChoiceChart';
import { NumberSummary } from '@/components/stats/NumberSummary';
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
        <p className="text-ink-500">
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
    return <p className="py-20 text-center text-ink-400">통계를 불러올 수 없습니다.</p>;
  }

  const hasChartData = stats.fields.some((f) => f.distribution && f.distribution.length > 0);
  const avgAnswerRate =
    stats.totalResponses > 0 && stats.fields.length > 0
      ? Math.round(
          (stats.fields.reduce((sum, f) => sum + f.answeredCount, 0) /
            stats.fields.length /
            stats.totalResponses) *
            100,
        )
      : 0;
  const summaryCells = [
    { label: '총 응답', value: stats.totalResponses.toLocaleString() },
    { label: '질문 수', value: stats.fields.length.toLocaleString() },
    { label: '평균 응답률', value: `${avgAnswerRate}%` },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href={`/forms/${formId}/responses`} className="text-sm text-ink-400 hover:text-ink-700">
            ← 응답 목록
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink-900">{form.title} · 통계</h1>
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
        <div className="rounded-xl border border-dashed border-line-input py-20 text-center">
          <p className="text-ink-400">응답이 모이면 통계가 표시됩니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {summaryCells.map((c) => (
              <div key={c.label} className="rounded-xl border border-line bg-white px-4 py-4 text-center">
                <div className="text-xs text-ink-400">{c.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-brand-dark sm:text-2xl">{c.value}</div>
              </div>
            ))}
          </div>

          {stats.fields.map((f, i) => {
            const answerRate =
              stats.totalResponses > 0 ? Math.round((f.answeredCount / stats.totalResponses) * 100) : 0;
            return (
            <section key={f.fieldId} className="rounded-xl border border-line bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                  {i + 1}
                </span>
                <h2 className="font-semibold text-ink-900">{f.label}</h2>
                <span className="rounded bg-surface-fill px-1.5 py-0.5 text-xs text-ink-400">
                  {FIELD_TYPE_LABELS[f.type as FieldType] ?? f.type}
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-300">
                  {f.answeredCount.toLocaleString()}명 응답 · {answerRate}%
                </span>
              </div>
              {f.type === 'SINGLE' && f.distribution && <SingleChoiceChart distribution={f.distribution} />}
              {f.type === 'MULTI' && f.distribution && <MultiChoiceChart distribution={f.distribution} />}
              {f.type === 'NUMBER' &&
                (f.numberStats ? (
                  <NumberSummary stats={f.numberStats} />
                ) : (
                  <p className="text-sm text-ink-300">아직 응답이 없습니다.</p>
                ))}
              {!['SINGLE', 'MULTI', 'NUMBER'].includes(f.type) && <TextSamples samples={f.sampleAnswers ?? []} />}
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
