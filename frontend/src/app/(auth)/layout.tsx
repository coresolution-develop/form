import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-bold text-gray-900">
        FormFlow
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
