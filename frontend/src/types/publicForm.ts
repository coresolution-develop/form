import type { FormField } from '@/types/field';

/** GET /api/f/{slug} 응답 — 응답자에게 노출되는 정보만. */
export interface PublicForm {
  slug: string;
  title: string;
  description: string | null;
  fields: FormField[];
}
