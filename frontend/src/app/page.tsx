import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold text-gray-900">FormFlow</h1>
          <p className="text-lg text-gray-600">5분 만에 만드는 온라인 설문·신청 폼</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            무료로 시작하기
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-200"
          >
            로그인
          </Link>
        </div>
      </main>
      <footer className="flex items-center justify-center gap-4 border-t border-gray-100 py-6 text-xs text-gray-400">
        <Link href="/terms/service" className="hover:text-gray-600">
          이용약관
        </Link>
        <Link href="/terms/privacy" className="hover:text-gray-600">
          개인정보처리방침
        </Link>
        <Link href="/terms/marketing" className="hover:text-gray-600">
          마케팅 수신
        </Link>
      </footer>
    </div>
  );
}
