'use client';

import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/queryClient';
import { RecaptchaProvider } from '@/components/auth/RecaptchaProvider';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient는 컴포넌트당 1회만 생성 (모듈 스코프 공유 버그 방지)
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RecaptchaProvider>{children}</RecaptchaProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
