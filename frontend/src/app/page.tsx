import Link from 'next/link';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Logo } from '@/components/ui/Logo';

const BTN_BASE =
  'inline-flex h-[46px] items-center justify-center rounded-[9px] px-[22px] text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:shadow-focus';
const BTN_PRIMARY = `${BTN_BASE} bg-brand text-white hover:bg-brand-dark`;
const BTN_SECONDARY = `${BTN_BASE} bg-surface-fill text-ink-900 hover:bg-surface-fill-hover`;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-10 border-b border-line-soft bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:px-10">
          <Link href="/" aria-label="FormFlow 홈">
            <Logo markSize={22} wordmarkClassName="text-base" />
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-lg px-3 py-[7px] text-[13.5px] font-medium text-ink-500 hover:bg-surface-fill hover:text-ink-900"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-3.5 py-[7px] text-[13.5px] font-medium text-white hover:bg-brand-dark"
            >
              시작하기
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* 히어로 */}
        <section className="bg-gradient-to-b from-[#f7fbfe] to-white">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-[22px] px-4 pb-14 pt-16 text-center md:pb-[76px] md:pt-[88px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(55,138,221,0.22)] bg-white px-3 py-1 text-xs font-medium text-brand-dark">
              <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-brand" />
              무료로 시작 · 신용카드 불필요
            </span>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink-900 md:text-[52px] md:leading-[1.14] md:tracking-[-1.7px]">
              5분이면 충분한
              <br />
              온라인 설문·신청 폼
            </h1>
            <p className="max-w-[560px] text-pretty text-lg text-ink-500 md:text-[17.5px]">
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
            <p className="text-sm text-ink-400">무료 플랜에서도 응답 CSV·통계를 제공합니다.</p>
          </div>
        </section>

        {/* 어떻게 작동하나요 */}
        <HowItWorks />

        {/* 마무리 CTA */}
        <section className="border-t border-line-soft bg-brand-light">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-4 py-14 text-center">
            <h2 className="text-[26px] font-semibold tracking-[-0.7px] text-ink-900">
              지금 바로 첫 폼을 만들어보세요
            </h2>
            <p className="text-base text-ink-500">
              회원가입은 1분, 첫 폼을 발행하기까지 5분이면 충분합니다.
            </p>
            <Link href="/signup" className={BTN_PRIMARY}>
              무료로 시작하기
            </Link>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-center gap-[18px] border-t border-line-soft py-[22px] text-xs text-ink-300">
        <Link href="/terms/service" className="hover:text-ink-500">
          이용약관
        </Link>
        <Link href="/terms/privacy" className="hover:text-ink-500">
          개인정보처리방침
        </Link>
        <Link href="/terms/marketing" className="hover:text-ink-500">
          마케팅 수신
        </Link>
      </footer>
    </div>
  );
}
