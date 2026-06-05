'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [
  { label: '대시보드', href: '/admin' },
  { label: '사용자', href: '/admin/users' },
  { label: '폼', href: '/admin/forms' },
  { label: '신고', href: '/admin/reports' },
  { label: '감사 로그', href: '/admin/audits' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-48 shrink-0 border-r border-gray-200 bg-gray-50 p-4 sm:block">
      <div className="mb-3 flex items-center gap-2 px-3">
        <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
          관리자
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm',
                active
                  ? 'bg-purple-50 font-medium text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
