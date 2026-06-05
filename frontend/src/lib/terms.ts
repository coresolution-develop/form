import { api } from '@/lib/api';
import type { TermsResponse, TermsType } from '@/types/terms';

export async function getTerms(type: TermsType): Promise<TermsResponse> {
  const res = await api.get(`/api/terms/${type}`);
  return res.data.data as TermsResponse;
}
