// Sentry 활성화 가드.
// NEXT_PUBLIC_SENTRY_DSN이 비어있으면 비활성 — 각 sentry.*.config.ts에서 init을 skip한다.

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** DSN이 설정된 경우에만 true. 로컬(빈 값)에서는 false → Sentry.init 미호출. */
export const sentryEnabled = typeof SENTRY_DSN === 'string' && SENTRY_DSN.length > 0;

export const SENTRY_ENV = process.env.NEXT_PUBLIC_ENV ?? 'production';
