'use client';

import { useAuthStore } from '@/store/authStore';

/** authStore 래퍼. 파생 상태(isAuthenticated/isAdmin)를 함께 노출. */
export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return {
    accessToken,
    user,
    isAuthenticated: !!accessToken && !!user,
    isAdmin: user?.role === 'ADMIN',
  };
}
