'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { getTerms } from '@/lib/terms';
import type { TermsResponse, TermsType } from '@/types/terms';

export function TermsPage({ type }: { type: TermsType }) {
  const [terms, setTerms] = useState<TermsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getTerms(type)
      .then(setTerms)
      .catch(() => setError(true));
  }, [type]);

  if (error) {
    return <p className="mx-auto max-w-2xl px-4 py-12 text-gray-600">약관을 불러올 수 없습니다.</p>;
  }
  if (!terms) {
    return (
      <div className="flex justify-center py-16 text-blue-600">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">{terms.title}</h1>
      <p className="mt-1 text-xs text-gray-400">
        버전 {terms.version}
        {terms.effectiveAt ? ` · 시행일 ${terms.effectiveAt.slice(0, 10)}` : ''}
      </p>
      <article
        className="prose-sm mt-6 leading-relaxed text-gray-800 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2"
        dangerouslySetInnerHTML={{ __html: terms.contentHtml }}
      />
    </main>
  );
}
