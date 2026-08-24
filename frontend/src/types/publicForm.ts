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
  /** 선착순 총 수량. null=선착순 미사용. */
  quotaTotal: number | null;
  /** 남은 수량. quotaTotal 이 null 이면 함께 null. */
  quotaRemaining: number | null;
  /** 수량 필드 id — 응답자 화면에서 잔여 안내를 붙일 위치. */
  quotaFieldId: number | null;
  fields: FormField[];
}
