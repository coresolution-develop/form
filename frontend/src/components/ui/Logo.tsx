/**
 * FormFlow 브랜드 로고 ("흐르는 필드" 심볼, 2026-08 확정 에셋).
 * 원본: formflow-symbol.svg — 512×512 viewBox, 바 2개(#2478C0) + 흐름 곡선(#0C4890).
 * 마크-워드마크 간격 = 마크 폭의 0.36.
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
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden
      className={className}
    >
      <g transform="translate(256,256) scale(0.98) translate(-256,-256)">
        <rect x="107" y="117" width="299" height="64" rx="32" fill="#2478C0" />
        <rect x="107" y="224" width="181" height="64" rx="32" fill="#2478C0" />
        <path
          d="M 139 363 H 267 C 325 363 347 320 347 267"
          stroke="#0C4890"
          strokeWidth="64"
          strokeLinecap="round"
        />
      </g>
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
