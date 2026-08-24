import type { FormField } from '@/types/field';

/** GET /api/f/{slug} 응답 — 응답자에게 노출되는 정보만. */
export interface PublicForm {
  slug: string;
  title: string;
  description: string | null;
  /** 배너 이미지(상단 전체폭). */
  headerImageUrl: string | null;
  /** 로고 이미지(제목 위 중앙 소형). */
  logoImageUrl: string | null;
  fields: FormField[];
}
