'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useUpdateQuota } from '@/hooks/useForms';
import { toUserMessage } from '@/lib/errorMessage';
import type { FormDetail } from '@/types/form';

/**
 * 빌더 폼 설정: 선착순 수량.
 * 수량 필드로 지정할 수 있는 건 '필수인 숫자 필드'뿐이다 — 값이 비면 몇 개를 차감할지 정할 수 없어서다.
 */
export function QuotaSettings({ form }: { form: FormDetail }) {
  const { toast } = useToast();
  const save = useUpdateQuota(form.id);

  const candidates = form.fields.filter((f) => f.type === 'NUMBER' && f.required);
  const enabledInitially = form.quotaTotal !== null;

  const [enabled, setEnabled] = useState(enabledInitially);
  const [total, setTotal] = useState(form.quotaTotal?.toString() ?? '');
  const [fieldId, setFieldId] = useState<string>(form.quotaFieldId?.toString() ?? '');

  // 서버 값이 바뀌면(저장 성공 등) 입력값을 다시 맞춘다.
  useEffect(() => {
    setEnabled(form.quotaTotal !== null);
    setTotal(form.quotaTotal?.toString() ?? '');
    setFieldId(form.quotaFieldId?.toString() ?? '');
  }, [form.quotaTotal, form.quotaFieldId]);

  const onSave = () => {
    if (!enabled) {
      save.mutate(
        { quotaTotal: null, quotaFieldId: null },
        {
          onSuccess: () => toast('선착순을 해제했어요.', 'success'),
          onError: (err: any) => toast(toUserMessage(err?.response?.data?.code, '저장 실패'), 'error'),
        },
      );
      return;
    }
    const n = Number(total);
    if (!Number.isInteger(n) || n < 1) {
      toast('총 수량은 1 이상의 정수여야 해요.', 'error');
      return;
    }
    if (!fieldId) {
      toast('수량 필드를 선택해주세요.', 'error');
      return;
    }
    save.mutate(
      { quotaTotal: n, quotaFieldId: Number(fieldId) },
      {
        onSuccess: () => toast('선착순 설정을 저장했어요.', 'success'),
        onError: (err: any) =>
          toast(err?.response?.data?.message ?? toUserMessage(err?.response?.data?.code, '저장 실패'), 'error'),
      },
    );
  };

  const remaining = form.quotaTotal === null ? null : Math.max(0, form.quotaTotal - form.quotaUsed);

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink-700">선착순 수량</h2>
          <p className="mt-0.5 text-xs text-ink-300">
            정해둔 수량이 다 차면 폼이 자동으로 마감됩니다.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          사용
        </label>
      </div>

      {enabled && (
        <div className="mt-4 flex flex-col gap-3">
          {candidates.length === 0 ? (
            <p className="rounded-lg bg-warn-bg px-3 py-2.5 text-xs leading-relaxed text-warn-fg">
              수량으로 쓸 필드가 없습니다. <b>필수로 지정된 숫자 필드</b>를 먼저 만들어주세요. (예: &ldquo;매수&rdquo;)
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="quota-total" className="text-xs text-ink-400">
                  총 수량
                </label>
                <input
                  id="quota-total"
                  type="number"
                  min={1}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="예: 200"
                  className="w-full rounded-lg border border-line-input px-3 py-2 text-sm tabular-nums outline-none focus:border-brand"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="quota-field" className="text-xs text-ink-400">
                  수량 필드 — 이 값만큼 차감됩니다
                </label>
                <select
                  id="quota-field"
                  value={fieldId}
                  onChange={(e) => setFieldId(e.target.value)}
                  disabled={form.quotaUsed > 0}
                  className="w-full rounded-lg border border-line-input px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-surface-subtle disabled:text-ink-300"
                >
                  <option value="">선택하세요</option>
                  {candidates.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                {form.quotaUsed > 0 && (
                  <p className="text-xs text-ink-300">
                    이미 접수가 시작돼 수량 필드는 바꿀 수 없습니다.
                  </p>
                )}
              </div>

              {remaining !== null && (
                <p className="rounded-lg bg-surface-subtle px-3 py-2 text-xs tabular-nums text-ink-500">
                  {form.quotaUsed.toLocaleString()}개 접수 · 남은 수량{' '}
                  <b className="text-brand-dark">{remaining.toLocaleString()}</b>개
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          loading={save.isPending}
          disabled={enabled && candidates.length === 0}
        >
          저장
        </Button>
      </div>
    </div>
  );
}
