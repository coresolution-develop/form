'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
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
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <Link href="/dashboard" className="text-lg font-bold text-gray-900">
        FormFlow
      </Link>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-md bg-purple-50 px-2.5 py-1 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            관리자
          </Link>
        )}
        {user && <span className="text-sm text-gray-600">{user.nickname}님</span>}
        <Button variant="ghost" size="sm" onClick={onLogout} loading={loading}>
          로그아웃
        </Button>
      </div>
    </header>
  );
}
