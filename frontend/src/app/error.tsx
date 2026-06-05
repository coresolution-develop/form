'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';
import { sentryEnabled } from '@/lib/sentry';

/**
 * 전역 에러 바운더리 (§9.1 error.tsx).
 * Sentry DSN이 설정된 경우에만 captureException (로컬은 비활성 → no-op).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (sentryEnabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">문제가 발생했습니다</h1>
      <p className="text-sm text-gray-600">잠시 후 다시 시도해주세요.</p>
      <Button onClick={reset} className="mt-2">
        다시 시도
      </Button>
    </main>
  );
}
