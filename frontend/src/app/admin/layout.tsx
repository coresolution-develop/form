'use client';

import { type ReactNode } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Header } from '@/components/layout/Header';

/**
 * 관리자 레이아웃 (§9.1 / §10.1).
 * AdminGuard 로 인증+권한을 보장한 뒤 관리자 전용 셸(헤더 + 관리자 사이드바)을 렌더한다.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
