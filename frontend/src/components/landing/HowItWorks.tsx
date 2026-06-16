import type { ReactNode } from 'react';

/**
 * 랜딩의 "어떻게 작동하나요" 섹션.
 * FormFlow 실제 화면(빌더 → 공개 폼 → 통계)을 단순화한 미니 목업으로 흐름을 보여준다.
 * 인터랙션이 없는 정적 표현이므로 서버 컴포넌트로 둔다.
 */

/** 미니 목업을 감싸는 빌더 캔버스 느낌의 패널. */
function MockCanvas({ children }: { children: ReactNode }) {
  return <div className="mt-5 space-y-2 rounded-xl bg-gray-50 p-3">{children}</div>;
}

/** 캔버스 안의 흰색 카드 한 장(질문/입력 등). */
function MockCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-gray-100 ${className ?? ''}`}>
      {children}
    </div>
  );
}

/** 질문 유형 칩. */
function TypeChip({ label }: { label: string }) {
  return (
    <span className="rounded bg-brand-light px-1.5 py-0.5 text-[10px] font-medium text-brand-dark">
      {label}
    </span>
  );
}

/** 선택된/비선택 라디오 옵션 한 줄. */
function RadioOption({ label, selected = false }: { label: string; selected?: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 text-[11px] ${selected ? 'text-gray-700' : 'text-gray-400'}`}>
      <span
        aria-hidden
        className={`h-2.5 w-2.5 rounded-full ${
          selected ? 'border-[3px] border-brand bg-white' : 'border border-gray-300'
        }`}
      />
      {label}
    </li>
  );
}

/** ① 만들기 — 폼 빌더 미니 목업. */
function BuildMock() {
  return (
    <MockCanvas>
      <MockCard>
        <div className="text-[10px] text-gray-400">폼 제목</div>
        <div className="text-sm font-semibold text-gray-900">2026 신입 회원 모집</div>
      </MockCard>

      <MockCard>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">이름</span>
          <TypeChip label="단답" />
        </div>
        <div className="mt-1.5 h-4 rounded border border-dashed border-gray-200" />
      </MockCard>

      <MockCard>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">관심 분야</span>
          <TypeChip label="객관식" />
        </div>
        <ul className="mt-1.5 space-y-1">
          <RadioOption label="프론트엔드" selected />
          <RadioOption label="백엔드" />
          <RadioOption label="디자인" />
        </ul>
      </MockCard>

      <div className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-1.5 text-[11px] font-medium text-gray-400">
        <span aria-hidden>+</span> 질문 추가
      </div>
    </MockCanvas>
  );
}

/** ② 공유 — 공개 링크 + 공개 폼 미니 목업. */
function ShareMock() {
  return (
    <MockCanvas>
      <MockCard className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-3.5 w-3.5 shrink-0 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.69a4.5 4.5 0 0 1 1.24 7.24l-2.5 2.5a4.5 4.5 0 0 1-6.36-6.36l1-1m6.4-3.4 1-1a4.5 4.5 0 0 1 6.36 6.36l-2.5 2.5a4.5 4.5 0 0 1-6.36 0" />
        </svg>
        <span className="flex-1 truncate text-[11px] text-gray-600">form.sosyge.net/f/recruit-2026</span>
        <span className="rounded bg-brand px-2 py-0.5 text-[10px] font-medium text-white">복사</span>
      </MockCard>

      <div className="text-center text-[10px] text-gray-400">누구나 링크로 접속해 응답</div>

      <MockCard>
        <div className="text-xs font-semibold text-gray-900">2026 신입 회원 모집</div>
        <div className="mt-2 space-y-2">
          <div>
            <div className="text-[10px] text-gray-400">이름</div>
            <div className="mt-1 h-4 rounded border border-gray-200" />
          </div>
          <ul className="space-y-1">
            <RadioOption label="프론트엔드" selected />
            <RadioOption label="백엔드" />
          </ul>
        </div>
        <div className="mt-2.5 flex h-6 items-center justify-center rounded-lg bg-brand text-[11px] font-medium text-white">
          제출하기
        </div>
      </MockCard>

      <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-brand-dark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-3 w-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 0h10.5a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-6a1.5 1.5 0 0 1 1.5-1.5Z" />
        </svg>
        로그인 없이 응답 가능
      </div>
    </MockCanvas>
  );
}

/** 통계 막대 한 줄. */
function StatBar({ label, value, percent }: { label: string; value: number; percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] text-gray-600">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-gray-500">{value}</span>
    </div>
  );
}

/** ③ 분석 — 응답 수 + 통계 차트 + CSV 미니 목업. */
function AnalyzeMock() {
  return (
    <MockCanvas>
      <MockCard className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">총 응답</span>
        <span className="text-base font-bold text-gray-900">128</span>
      </MockCard>

      <MockCard className="space-y-2">
        <div className="text-[10px] font-medium text-gray-400">관심 분야 응답 분포</div>
        <StatBar label="프론트엔드" value={52} percent={82} />
        <StatBar label="백엔드" value={33} percent={52} />
        <StatBar label="디자인" value={21} percent={33} />
      </MockCard>

      <div className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1.5 text-[11px] font-medium text-gray-700 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        CSV 다운로드
      </div>
    </MockCanvas>
  );
}

const STEPS = [
  {
    id: 1,
    title: '질문을 추가해 폼 만들기',
    desc: '단답·객관식·날짜 등 7가지 질문 유형을 추가하고, 순서도 자유롭게 바꿀 수 있어요.',
    mock: <BuildMock />,
  },
  {
    id: 2,
    title: '링크 하나로 공유하기',
    desc: '폼을 발행하면 공개 링크가 생깁니다. 응답자는 회원가입 없이 바로 작성해요.',
    mock: <ShareMock />,
  },
  {
    id: 3,
    title: '응답을 실시간 분석하기',
    desc: '들어온 응답을 표와 통계 차트로 확인하고, CSV로 내려받아 정리하세요.',
    mock: <AnalyzeMock />,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-gray-100 bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-brand-dark">사용법</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            세 단계면 끝납니다
          </h2>
          <p className="mt-3 text-base text-gray-600">
            FormFlow가 실제로 어떻게 동작하는지 한눈에 살펴보세요.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3 md:gap-5">
          {STEPS.map((step) => (
            <li
              key={step.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {step.id}
                </span>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
              {step.mock}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
