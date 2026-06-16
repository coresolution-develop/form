import Link from 'next/link';
import { HowItWorks } from '@/components/landing/HowItWorks';

const BTN_BASE =
  'inline-flex h-12 items-center justify-center rounded-lg px-6 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const BTN_PRIMARY = `${BTN_BASE} bg-brand text-white hover:bg-brand-dark`;
const BTN_SECONDARY = `${BTN_BASE} bg-gray-100 text-gray-900 hover:bg-gray-200`;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="text-lg font-bold tracking-tight text-gray-900">FormFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              시작하기
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 히어로 */}
        <section className="bg-gradient-to-b from-brand-light/40 to-white">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center md:py-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand-dark">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
              무료로 시작 · 신용카드 불필요
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 md:text-5xl">
              5분이면 충분한
              <br />
              온라인 설문·신청 폼
            </h1>
            <p className="max-w-xl text-lg text-gray-600 md:text-xl">
              코딩 없이 질문을 추가하고, 링크 하나로 공유하고, 응답을 실시간으로 분석하세요.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={BTN_PRIMARY}>
                무료로 시작하기
              </Link>
              <Link href="/login" className={BTN_SECONDARY}>
                로그인
              </Link>
            </div>
            <p className="text-sm text-gray-500">무료 플랜에서도 응답 CSV·통계를 제공합니다.</p>
          </div>
        </section>

        {/* 어떻게 작동하나요 */}
        <HowItWorks />

        {/* 마무리 CTA */}
        <section className="border-t border-gray-100 bg-brand-light">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              지금 바로 첫 폼을 만들어보세요
            </h2>
            <p className="text-base text-gray-600">
              회원가입은 1분, 첫 폼을 발행하기까지 5분이면 충분합니다.
            </p>
            <Link href="/signup" className={BTN_PRIMARY}>
              무료로 시작하기
            </Link>
          </div>
        </section>
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
