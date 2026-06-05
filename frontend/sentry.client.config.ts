import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// DSN이 비어있으면(로컬) init 자체를 호출하지 않는다.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: ['ResizeObserver loop limit exceeded'],
  });
}
