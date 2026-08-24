import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-4 py-12">
      <Link href="/" aria-label="FormFlow 홈" className="mb-8">
        <Logo markSize={28} wordmarkClassName="text-xl" />
      </Link>
      <div className="w-full max-w-[352px] overflow-hidden rounded-xl border border-line bg-white">
        <div className="h-1.5 bg-brand" />
        <div className="p-7">{children}</div>
      </div>
    </div>
  );
}
