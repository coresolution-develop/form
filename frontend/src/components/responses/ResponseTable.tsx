'use client';

import { displayAnswerValue } from '@/lib/responses';
import type { FormField } from '@/types/field';
import type { ResponseListItem } from '@/types/response';

interface Props {
  fields: FormField[];
  responses: ResponseListItem[];
}

export function ResponseTable({ fields, responses }: Props) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-line">
      <table className="min-w-full divide-y divide-line-softer">
        <thead className="bg-surface-subtle">
          <tr>
            <th className="whitespace-nowrap px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-ink-400">
              제출시각
            </th>
            {fields.map((f) => (
              <th
                key={f.id}
                className="whitespace-nowrap px-3.5 py-2.5 text-left text-[11.5px] font-semibold text-ink-400"
              >
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-softer bg-white text-[13px]">
          {responses.map((r) => {
            const byField = new Map(r.answers.map((a) => [a.fieldId, a.value]));
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-3.5 py-[11px] tabular-nums text-ink-400">
                  {r.submittedAt?.replace('T', ' ').slice(0, 19)}
                </td>
                {fields.map((f) => {
                  const raw = byField.get(f.id);
                  const text = raw == null ? '' : displayAnswerValue(raw);
                  return (
                    <td key={f.id} className="max-w-[240px] truncate px-3.5 py-[11px] text-ink-700" title={text}>
                      {text || <span className="text-[#cfd4da]">—</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
