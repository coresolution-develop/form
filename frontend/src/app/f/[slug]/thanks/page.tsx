import Link from 'next/link';

const API = process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL;

async function fetchTitle(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/api/f/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.success ? (json.data.title as string) : null;
  } catch {
    return null;
  }
}

export default async function ThanksPage({ params }: { params: { slug: string } }) {
  const title = await fetchTitle(params.slug);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="h-1.5 bg-brand" />
        <div className="px-8 py-12">
          <h1 className="text-xl font-semibold text-gray-900">응답해 주셔서 감사합니다 🎉</h1>
          {title && <p className="mt-2 text-sm text-gray-500">‘{title}’에 정상적으로 제출되었습니다.</p>}
          <p className="mt-1 text-xs text-gray-400">응답은 한 번만 제출할 수 있습니다.</p>
          <Link href="/" className="mt-6 inline-block text-sm text-brand hover:underline">
            FormFlow 둘러보기
          </Link>
        </div>
      </div>
    </main>
  );
}
