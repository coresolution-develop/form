'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';

export function Header() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="flex h-[52px] items-center justify-between border-b border-line-soft bg-white px-6">
      <Link href="/dashboard" aria-label="FormFlow 대시보드">
        <Logo markSize={19} wordmarkClassName="text-[15px]" />
      </Link>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-md bg-admin-bg px-2.5 py-1 text-xs font-medium text-admin-fg hover:opacity-80"
          >
            관리자
          </Link>
        )}
        {user && <span className="text-[13px] text-ink-500">{user.nickname}님</span>}
        <Button variant="ghost" size="sm" onClick={onLogout} loading={loading}>
          로그아웃
        </Button>
      </div>
    </header>
  );
}
