'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [{ label: '내 폼', href: '/dashboard' }];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[196px] shrink-0 border-r border-line-soft bg-surface-subtle px-3 py-3.5 sm:block">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith('/builder');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-[7px] px-[11px] py-2 text-[13.5px]',
                active ? 'bg-brand-light font-medium text-brand-dark' : 'text-ink-500 hover:bg-surface-fill',
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
