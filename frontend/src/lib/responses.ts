import { api } from '@/lib/api';
import type { PageResponse } from '@/types/api';
import type { ResponseListItem } from '@/types/response';
import type { StatsResponse } from '@/types/stats';

export async function getResponses(
  formId: number,
  page: number,
  size = 20,
): Promise<PageResponse<ResponseListItem>> {
  const res = await api.get(`/api/forms/${formId}/responses`, { params: { page, size } });
  return res.data.data as PageResponse<ResponseListItem>;
}

export async function getStats(formId: number): Promise<StatsResponse> {
  const res = await api.get(`/api/forms/${formId}/stats`);
  return res.data.data as StatsResponse;
}

/** CSV 다운로드 — 인증 필요(api). blob → a[download] 트리거. */
export async function downloadResponsesCsv(formId: number): Promise<void> {
  const res = await api.get(`/api/forms/${formId}/responses/export`, {
    params: { format: 'csv' },
    responseType: 'blob',
  });
  const disposition = res.headers['content-disposition'] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `form-${formId}-responses.csv`;

  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** MULTI 값(JSON 배열 문자열)을 "옵션1, 옵션2"로 표시. 일반 값은 원본. */
export function displayAnswerValue(value: string): string {
  const v = value?.trim() ?? '';
  if (v.startsWith('[')) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      // ignore
    }
  }
  return value ?? '';
}
