import axios from 'axios';
import type { PublicForm } from '@/types/publicForm';

// 공개 폼은 비로그인 응답자용 — 인증 axios(lib/api.ts) interceptor를 절대 타지 않는다.
// refresh/Authorization 주입 없이 plain axios로 호출.
const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const publicApi = axios.create({ baseURL: API_URL, timeout: 15000 });

export interface SubmitAnswer {
  fieldId: number;
  value: string;
}

export interface SubmitPayload {
  respondentKey: string;
  answers: SubmitAnswer[];
}

export async function getPublicForm(slug: string): Promise<PublicForm | null> {
  try {
    const res = await publicApi.get(`/api/f/${slug}`);
    return res.data?.success ? (res.data.data as PublicForm) : null;
  } catch {
    return null;
  }
}

export async function submitPublicForm(
  slug: string,
  payload: SubmitPayload,
  recaptchaToken: string,
): Promise<void> {
  await publicApi.post(`/api/f/${slug}/submit`, payload, {
    headers: { 'X-Recaptcha-Token': recaptchaToken },
  });
}

export async function reportPublicForm(
  slug: string,
  reason: string,
  detail: string,
): Promise<void> {
  await publicApi.post(`/api/f/${slug}/report`, { reason, detail });
}
