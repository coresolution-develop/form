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
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">제출시각</th>
            {fields.map((f) => (
              <th key={f.id} className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {responses.map((r) => {
            const byField = new Map(r.answers.map((a) => [a.fieldId, a.value]));
            return (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {r.submittedAt?.replace('T', ' ').slice(0, 19)}
                </td>
                {fields.map((f) => {
                  const raw = byField.get(f.id);
                  const text = raw == null ? '' : displayAnswerValue(raw);
                  return (
                    <td key={f.id} className="max-w-[240px] truncate px-4 py-3 text-gray-800" title={text}>
                      {text || <span className="text-gray-300">—</span>}
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
