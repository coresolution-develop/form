'use client';

import { useEffect, useState } from 'react';
import { PasswordResetConfirmForm } from '@/components/auth/PasswordResetConfirmForm';

export default function PasswordResetConfirmPage() {
  // ?token= 을 클라이언트에서 1회 추출 (useSearchParams Suspense 요구 회피)
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">새 비밀번호 설정</h1>
      {token === null ? (
        <p className="text-sm text-gray-500">링크를 확인하는 중…</p>
      ) : token === '' ? (
        <p className="text-sm text-red-600">유효하지 않은 링크입니다.</p>
      ) : (
        <PasswordResetConfirmForm token={token} />
      )}
    </div>
  );
}
