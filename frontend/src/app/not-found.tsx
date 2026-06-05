import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-bold text-gray-900">404</h1>
      <p className="text-sm text-gray-600">존재하지 않거나 응답할 수 없는 페이지입니다.</p>
      <Link href="/" className="mt-2 text-sm text-blue-600 hover:underline">
        홈으로
      </Link>
    </main>
  );
}
