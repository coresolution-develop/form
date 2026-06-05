'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [{ label: '내 폼', href: '/dashboard' }];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-48 shrink-0 border-r border-gray-200 bg-gray-50 p-4 sm:block">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith('/builder');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm',
                active ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-700 hover:bg-gray-100',
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
