'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { useBootstrap } from '@/hooks/useBootstrap';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const status = useBootstrap();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authed') {
    return (
      <div className="flex min-h-screen items-center justify-center text-blue-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
