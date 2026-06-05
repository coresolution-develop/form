import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PublicForm } from '@/components/form/PublicForm';
import type { PublicForm as PublicFormType } from '@/types/publicForm';

// SSR 전용 fetch — 비로그인 응답자용이라 인증 axios를 쓰지 않고 plain fetch.
const API = process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL;

// generateMetadata와 page가 같은 요청 내에서 중복 호출되지 않도록 dedupe.
const fetchForm = cache(async (slug: string): Promise<PublicFormType | null> => {
  const res = await fetch(`${API}/api/f/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.success ? (json.data as PublicFormType) : null;
});

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const form = await fetchForm(params.slug);
  if (!form) return { title: 'FormFlow' };
  return {
    title: `${form.title} | FormFlow`,
    description: form.description ?? form.title,
  };
}

export default async function PublicFormPage({ params }: { params: { slug: string } }) {
  const form = await fetchForm(params.slug);
  if (!form) notFound();
  return (
    <main className="min-h-screen bg-gray-50">
      <PublicForm form={form} />
    </main>
  );
}
