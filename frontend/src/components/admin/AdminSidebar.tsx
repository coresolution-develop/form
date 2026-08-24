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
    <aside className="hidden w-[196px] shrink-0 border-r border-line-soft bg-surface-subtle px-3 py-3.5 sm:block">
      <div className="mb-3 flex items-center gap-2 px-[11px]">
        <span className="rounded-md bg-admin-bg px-2 py-0.5 text-xs font-semibold text-admin-fg">
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
                'rounded-[7px] px-[11px] py-2 text-[13.5px]',
                active
                  ? 'bg-admin-bg font-medium text-admin-fg'
                  : 'text-ink-500 hover:bg-surface-fill',
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
