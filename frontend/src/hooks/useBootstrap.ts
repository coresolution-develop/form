'use client';

import { useEffect, useState } from 'react';
import { getMe, refreshSession, toUser } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

export type BootstrapStatus = 'loading' | 'authed' | 'guest';

/**
 * 앱 마운트 시 1회 세션 복구를 시도한다 (§9.3 주의: 새로고침 시 메모리 토큰 휘발).
 * - 메모리에 토큰+유저가 이미 있으면 즉시 authed
 * - 없으면 refresh → getMe 로 복구, 실패하면 guest
 */
export function useBootstrap(): BootstrapStatus {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const [status, setStatus] = useState<BootstrapStatus>(
    accessToken && user ? 'authed' : 'loading',
  );

  useEffect(() => {
    if (accessToken && user) {
      setStatus('authed');
      return;
    }
    let active = true;
    (async () => {
      try {
        await refreshSession();
        const me = await getMe();
        if (!active) return;
        setUser(toUser(me));
        setStatus('authed');
      } catch {
        if (!active) return;
        clear();
        setStatus('guest');
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
