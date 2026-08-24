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
  /** 배너 이미지(상단 전체폭). */
  headerImageUrl: string | null;
  /** 로고 이미지(제목 위 중앙 소형). 배너와 독립 슬롯이라 동시 사용 가능. */
  logoImageUrl: string | null;
  status: FormStatus;
  responseLimit: number | null;
  /** 선착순 총 수량. null=선착순 미사용. */
  quotaTotal: number | null;
  /** 수량을 차감할 기준 NUMBER 필드 id. */
  quotaFieldId: number | null;
  /** 지금까지 소진된 수량. */
  quotaUsed: number;
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
