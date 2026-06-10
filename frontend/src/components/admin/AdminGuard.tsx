'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useBootstrap } from '@/hooks/useBootstrap';

/**
 * 관리자 영역 가드 (§10.1).
 *
 * <p>이중 가드: (1) useBootstrap 으로 세션 복구(인증) → guest면 /login,
 * (2) 복구된 user.role 검사 → ADMIN 아니면 /dashboard.
 *
 * <p>★ 새로고침 시 메모리 토큰이 휘발하므로 bootstrap 이 'loading' 인 동안에는
 * 절대 리다이렉트하지 않고 스피너를 보여준다(성급한 리다이렉트로 관리자가 튕기는 것 방지).
 * 실제 권한 판정은 status==='authed' 로 user 가 복구된 뒤에만 수행한다.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useBootstrap();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    } else if (status === 'authed' && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [status, isAdmin, router]);

  // 세션 복구 전(loading) 또는 권한 없는 사용자 → 리다이렉트 진행 중 스피너
  if (status !== 'authed' || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <>{children}</>;
}
