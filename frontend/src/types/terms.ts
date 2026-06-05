export type TermsType = 'service' | 'privacy' | 'marketing';

/** GET /api/terms/{type} 응답 (TermsResponse 와 일치). */
export interface TermsResponse {
  type: string;
  version: string;
  title: string;
  contentHtml: string;
  effectiveAt: string | null;
}
