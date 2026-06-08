'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FieldRenderer } from '@/components/form/FieldRenderer';
import { ReportFormModal } from '@/components/form/ReportFormModal';
import { Button } from '@/components/ui/Button';
import { toUserMessage } from '@/lib/errorMessage';
import { useRecaptcha } from '@/lib/recaptcha';
import { submitPublicForm, type SubmitAnswer } from '@/lib/publicForm';
import type { FormField } from '@/types/field';
import type { PublicForm as PublicFormType } from '@/types/publicForm';

type AnswerValue = string | string[];

function isEmpty(v: AnswerValue | undefined): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return v.trim() === '';
}

export function PublicForm({ form }: { form: PublicFormType }) {
  const router = useRouter();
  const executeRecaptcha = useRecaptcha();

  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [respondentKey, setRespondentKey] = useState('');

  // respondentKey: 마운트 시 localStorage에서 가져오거나 생성 후 보관 (재방문 중복 방지 UX)
  useEffect(() => {
    const storageKey = `formflow_respondent_${form.slug}`;
    let key = localStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(storageKey, key);
    }
    setRespondentKey(key);
  }, [form.slug]);

  const setAnswer = (fieldId: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const validateClient = (): boolean => {
    const next: Record<number, string> = {};
    for (const field of form.fields) {
      if (field.required && isEmpty(answers[field.id])) {
        next[field.id] = '필수 항목입니다.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildAnswers = (): SubmitAnswer[] =>
    form.fields
      .map((field) => {
        const v = answers[field.id];
        if (isEmpty(v)) return null;
        // §5.2 규약: MULTI → JSON 배열 문자열, 나머지 → 단일 문자열
        const value = field.type === 'MULTI' ? JSON.stringify(v as string[]) : String(v);
        return { fieldId: field.id, value };
      })
      .filter((a): a is SubmitAnswer => a !== null);

  const onSubmit = async () => {
    setFormError(null);
    if (!validateClient()) return;
    setSubmitting(true);
    try {
      const token = await executeRecaptcha('submit');
      await submitPublicForm(form.slug, { respondentKey, answers: buildAnswers() }, token);
      router.push(`/f/${form.slug}/thanks`);
    } catch (e: any) {
      const code = e?.response?.data?.code as string | undefined;
      if (code === 'DUPLICATE_RESPONSE') {
        setFormError('이미 응답하셨습니다. 한 번만 제출할 수 있습니다.');
      } else if (code === 'FORM_NOT_AVAILABLE') {
        setFormError('마감되었거나 응답할 수 없는 폼입니다.');
      } else if (code === 'VALIDATION_ERROR') {
        const fe = e?.response?.data?.details?.fieldErrors as Record<string, string> | undefined;
        if (fe) {
          const mapped: Record<number, string> = {};
          Object.entries(fe).forEach(([k, msg]) => (mapped[Number(k)] = msg));
          setErrors(mapped);
        }
        setFormError('입력값을 확인해주세요.');
      } else {
        setFormError(toUserMessage(code, '제출에 실패했습니다.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="h-1.5 bg-brand" />
          <div className="p-7">
            <h1 className="text-xl font-semibold text-gray-900">{form.title}</h1>
            {form.description && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-500">{form.description}</p>
            )}

            <div className="my-6 border-t border-gray-100" />

            <div className="flex flex-col gap-5">
              {form.fields.map((field: FormField) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => setAnswer(field.id, v)}
                  error={errors[field.id]}
                />
              ))}
            </div>

            {formError && <p className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</p>}

            <Button className="mt-8" fullWidth size="lg" onClick={onSubmit} loading={submitting}>
              제출하기
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 text-xs text-gray-400">
          <span>FormFlow로 만든 폼</span>
          <button type="button" onClick={() => setReportOpen(true)} className="underline hover:text-gray-600">
            신고하기
          </button>
        </div>
      </div>

      <ReportFormModal slug={form.slug} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
