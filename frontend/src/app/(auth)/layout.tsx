import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-bold text-gray-900">
        FormFlow
      </Link>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="h-1.5 bg-brand" />
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
