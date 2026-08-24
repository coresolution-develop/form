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

/** 배너 이미지 업로드/교체 (multipart, 상단 전체폭). */
export async function uploadHeaderImage(id: number, file: File): Promise<FormDetail> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(`/api/forms/${id}/header-image`, fd);
  return res.data.data as FormDetail;
}

/** 배너 이미지 제거. */
export async function deleteHeaderImage(id: number): Promise<FormDetail> {
  const res = await api.delete(`/api/forms/${id}/header-image`);
  return res.data.data as FormDetail;
}

/** 로고 이미지 업로드/교체 (multipart, 제목 위 중앙 소형). 배너와 독립 슬롯. */
export async function uploadLogoImage(id: number, file: File): Promise<FormDetail> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(`/api/forms/${id}/logo-image`, fd);
  return res.data.data as FormDetail;
}

/** 로고 이미지 제거. */
export async function deleteLogoImage(id: number): Promise<FormDetail> {
  const res = await api.delete(`/api/forms/${id}/logo-image`);
  return res.data.data as FormDetail;
}

/** 마감 예정 시각 설정/해제 (#1). closesAt=null → 무기한. ISO 문자열(초 미포함 가능). */
export async function updateClosesAt(id: number, closesAt: string | null): Promise<void> {
  await api.patch(`/api/forms/${id}/closes-at`, { closesAt });
}

export async function updateFormStatus(
  id: number,
  status: FormStatus,
  closedAt?: string | null,
): Promise<void> {
  await api.patch(`/api/forms/${id}/status`, { status, closedAt: closedAt ?? null });
}
