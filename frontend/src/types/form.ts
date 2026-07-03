import type { FormField } from './field';

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

/** 공개 폼 헤더 이미지 표시 방식 — LOGO=상단 중앙 소형, BANNER=상단 전체폭. */
export type HeaderImageStyle = 'LOGO' | 'BANNER';

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
  headerImageUrl: string | null;
  headerImageStyle: HeaderImageStyle | null;
  status: FormStatus;
  responseLimit: number | null;
  responseCount: number;
  closedAt: string | null;
  closesAt: string | null;
  publicUrl: string;
  fields: FormField[];
}

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  DRAFT: '작성 중',
  PUBLISHED: '공개',
  CLOSED: '마감',
};
