import { api } from '@/lib/api';
import type { PageResponse } from '@/types/api';
import type { FormDetail, FormStatus, FormSummary } from '@/types/form';

export interface FormCreateInput {
  title: string;
  description?: string | null;
}
export interface FormUpdateInput {
  title?: string;
  description?: string | null;
  responseLimit?: number;
}

export async function listForms(page: number, size = 20): Promise<PageResponse<FormSummary>> {
  const res = await api.get('/api/forms', { params: { page, size } });
  return res.data.data as PageResponse<FormSummary>;
}

export async function getForm(id: number): Promise<FormDetail> {
  const res = await api.get(`/api/forms/${id}`);
  return res.data.data as FormDetail;
}

export async function createForm(input: FormCreateInput): Promise<FormDetail> {
  const res = await api.post('/api/forms', input);
  return res.data.data as FormDetail;
}

export async function updateForm(id: number, input: FormUpdateInput): Promise<FormDetail> {
  const res = await api.patch(`/api/forms/${id}`, input);
  return res.data.data as FormDetail;
}

export async function deleteForm(id: number): Promise<void> {
  await api.delete(`/api/forms/${id}`);
}

export async function updateFormStatus(
  id: number,
  status: FormStatus,
  closedAt?: string | null,
): Promise<void> {
  await api.patch(`/api/forms/${id}/status`, { status, closedAt: closedAt ?? null });
}
