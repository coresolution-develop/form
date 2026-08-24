'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FieldRenderer } from '@/components/form/FieldRenderer';
import { Button } from '@/components/ui/Button';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { toUserMessage } from '@/lib/errorMessage';
import { useRecaptcha } from '@/lib/recaptcha';
import { submitPublicForm, type SubmitAnswer } from '@/lib/publicForm';
import type { FormField } from '@/types/field';
import type { PublicForm as PublicFormType } from '@/types/publicForm';

type AnswerValue = string | string[];

// reCAPTCHA 활성 여부(빌드 시 인라인). 활성일 때만 Google 고지문을 노출한다.
const RECAPTCHA_ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED !== 'false';

const COPYRIGHT_YEAR = new Date().getFullYear();

function isEmpty(v: AnswerValue | undefined): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return v.trim() === '';
}

/** 조건부 표시 평가 — 조건 없으면 항상 표시. 기준 필드 답이 values 중 하나면 표시. */
function isFieldVisible(field: FormField, answers: Record<number, AnswerValue>): boolean {
  const cond = field.validation?.condition;
  if (!cond || !cond.fieldId || !cond.values?.length) return true;
  const a = answers[cond.fieldId];
  if (a == null) return false;
  if (Array.isArray(a)) return a.some((v) => cond.values.includes(v));
  return cond.values.includes(a);
}

export function PublicForm({ form }: { form: PublicFormType }) {
  const router = useRouter();
  const executeRecaptcha = useRecaptcha();

  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [respondentKey, setRespondentKey] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const submittedKey = `formflow_submitted_${form.slug}`;
  const hasRequired = form.fields.some((f) => f.required);

  // respondentKey: 마운트 시 localStorage에서 가져오거나 생성 후 보관 (재방문 중복 방지 UX)
  // 이 기기에서 이미 제출한 기록이 있으면 폼 대신 '응답 완료' 화면을 보여준다.
  useEffect(() => {
    const storageKey = `formflow_respondent_${form.slug}`;
    let key = localStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(storageKey, key);
    }
    setRespondentKey(key);
    if (localStorage.getItem(submittedKey)) {
      setAlreadySubmitted(true);
    }
  }, [form.slug, submittedKey]);

  // 입력 중 실수로 페이지를 벗어나면 경고 (제출 중/완료 시엔 경고하지 않음)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty = Object.values(answers).some((v) => !isEmpty(v));
      if (dirty && !submitting && !alreadySubmitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [answers, submitting, alreadySubmitted]);

  const setAnswer = (fieldId: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  // 오류 발생 시 화면 순서상 첫 오류 문항으로 스크롤 + 포커스 (긴 폼에서 헤매지 않도록)
  const focusFirstError = (errs: Record<number, string>) => {
    const first = form.fields.find((f) => errs[f.id]);
    if (!first) return;
    requestAnimationFrame(() => {
      const wrapper = document.getElementById(`ff-field-${first.id}`);
      wrapper?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = wrapper?.querySelector<HTMLElement>('input, textarea, select');
      control?.focus({ preventScroll: true });
    });
  };

  const validateClient = (): boolean => {
    const next: Record<number, string> = {};
    for (const field of form.fields) {
      if (!isFieldVisible(field, answers)) continue; // 숨은 필드는 검증 제외
      if (field.required && isEmpty(answers[field.id])) {
        next[field.id] = '필수 항목입니다.';
      }
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok) focusFirstError(next);
    return ok;
  };

  const buildAnswers = (): SubmitAnswer[] =>
    form.fields
      .map((field) => {
        if (!isFieldVisible(field, answers)) return null; // 숨은 필드 답은 전송하지 않음
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
      localStorage.setItem(submittedKey, '1');
      router.push(`/f/${form.slug}/thanks`);
    } catch (e: any) {
      const code = e?.response?.data?.code as string | undefined;
      if (code === 'DUPLICATE_RESPONSE') {
        // 서버가 중복으로 막았다면 이 기기에도 기록해 재방문 시 '응답 완료' 화면을 보여준다.
        localStorage.setItem(submittedKey, '1');
        setAlreadySubmitted(true);
      } else if (code === 'FORM_NOT_AVAILABLE') {
        setFormError('마감되었거나 응답할 수 없는 폼입니다.');
      } else if (code === 'VALIDATION_ERROR') {
        const fe = e?.response?.data?.details?.fieldErrors as Record<string, string> | undefined;
        if (fe) {
          const mapped: Record<number, string> = {};
          Object.entries(fe).forEach(([k, msg]) => (mapped[Number(k)] = msg));
          setErrors(mapped);
          focusFirstError(mapped);
        }
        setFormError('입력값을 확인해주세요.');
      } else {
        setFormError(toUserMessage(code, '제출에 실패했습니다.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="h-1.5 bg-brand" />
          <div className="px-8 py-12">
            <h1 className="text-xl font-semibold text-gray-900">이미 응답하셨습니다</h1>
            <p className="mt-2 text-sm text-gray-500">이 설문은 한 번만 응답할 수 있어요.</p>
            <p className="mt-1 text-xs text-gray-400">참여해 주셔서 감사합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {!form.headerImageUrl && <div className="h-1.5 bg-brand" />}
          <div className={form.headerImageUrl ? 'p-7' : 'p-7 pb-6'}>
            {form.logoImageUrl && (
              <div className="mb-5 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveAssetUrl(form.logoImageUrl)} alt="" className="max-h-14 w-auto" />
              </div>
            )}
            <h1 className="break-words text-xl font-semibold text-gray-900">{form.title}</h1>
            {form.quotaRemaining !== null && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-light px-3 py-1.5 text-sm text-brand-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                선착순 · 남은 수량 <b className="tabular-nums">{form.quotaRemaining.toLocaleString()}</b>개
              </p>
            )}
            {form.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-500">
                {form.description}
              </p>
            )}
            {hasRequired && (
              <p className="mt-2 text-xs text-gray-400">
                <span className="text-red-500">*</span> 표시는 필수 항목입니다.
              </p>
            )}
          </div>
          {form.headerImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveAssetUrl(form.headerImageUrl)} alt="" className="h-auto w-full" />
          )}
          <div className={form.headerImageUrl ? 'p-7' : 'mx-7 border-t border-gray-100 pb-7 pt-6'}>
            <div className="flex flex-col gap-5">
              {form.fields
                .filter((field) => isFieldVisible(field, answers))
                .map((field: FormField) => (
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

            {RECAPTCHA_ENABLED && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
                이 사이트는 reCAPTCHA로 보호되며 Google{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  개인정보처리방침
                </a>
                과{' '}
                <a
                  href="https://policies.google.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  서비스 약관
                </a>
                이 적용됩니다.
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 text-center text-xs text-gray-400">© {COPYRIGHT_YEAR} CoreSolution. All rights reserved.</div>
      </div>
    </div>
  );
}
