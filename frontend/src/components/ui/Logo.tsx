/**
 * FormFlow 브랜드 로고 (확정안 1a "흐르는 필드").
 * 원본 스펙: design_handoff_formflow_ui/README.md §Assets — 48×48 viewBox, 요소 3개.
 * 마크-워드마크 간격 = 마크 폭의 0.36, 최소 사용 크기 16px.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 20, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect x="10" y="11" width="28" height="6" rx="3" fill="#378ADD" opacity="0.3" />
      <rect x="10" y="21" width="17" height="6" rx="3" fill="#378ADD" opacity="0.55" />
      <path d="M13 34H25C30.5 34 32.5 30 32.5 25" stroke="#378ADD" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  markSize?: number;
  /** 워드마크 타이포 조정용 (크기·자간 등) */
  wordmarkClassName?: string;
}

/** 마크 + 워드마크 가로 락업. 워드마크는 "Form"(600) + "Flow"(400) 조합. */
export function Logo({ markSize = 20, wordmarkClassName = 'text-lg' }: LogoProps) {
  return (
    <span className="inline-flex items-center" style={{ gap: Math.round(markSize * 0.36) }}>
      <LogoMark size={markSize} />
      <span className={`tracking-tight text-gray-900 ${wordmarkClassName}`}>
        <span className="font-semibold">Form</span>
        <span className="font-normal">Flow</span>
      </span>
    </span>
  );
}
