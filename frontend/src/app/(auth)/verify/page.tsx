'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { resendVerification, verifyEmail } from '@/lib/auth';
import { toUserMessage } from '@/lib/errorMessage';

type Status = 'verifying' | 'error';

export default function VerifyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>('verifying');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode 이중 실행 방지
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    verifyEmail(token)
      .then(() => router.replace('/dashboard'))
      .catch(() => setStatus('error'));
  }, [router]);

  const onResend = async () => {
    if (!email) {
      toast('이메일을 입력해주세요.', 'error');
      return;
    }
    setResending(true);
    try {
      await resendVerification(email);
      toast('인증 메일을 재발송했습니다.', 'success');
    } catch (e: any) {
      toast(toUserMessage(e?.response?.data?.code, '재발송에 실패했습니다.'), 'error');
    } finally {
      setResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-gray-600">
        <Spinner className="h-6 w-6 text-blue-600" />
        <p className="text-sm">이메일 인증을 처리하고 있습니다…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">인증 링크가 유효하지 않습니다</h1>
      <p className="text-sm text-gray-600">링크가 만료되었거나 이미 사용되었습니다. 인증 메일을 다시 받아보세요.</p>
      <Input
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button onClick={onResend} fullWidth loading={resending}>
        인증 메일 재발송
      </Button>
    </div>
  );
}
