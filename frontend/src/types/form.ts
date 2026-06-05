import type { FormField } from './field';

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface FormSummary {
  id: number;
  slug: string;
  title: string;
  status: FormStatus;
  responseCount: number;
  responseLimit: number | null;
  createdAt: string;
}

export interface FormDetail {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  responseLimit: number | null;
  responseCount: number;
  closedAt: string | null;
  publicUrl: string;
  fields: FormField[];
}

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  DRAFT: '작성 중',
  PUBLISHED: '공개',
  CLOSED: '마감',
};
