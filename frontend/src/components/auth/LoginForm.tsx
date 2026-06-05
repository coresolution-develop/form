'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { login } from '@/lib/auth';
import { toUserMessage } from '@/lib/errorMessage';
import { useRecaptcha } from '@/lib/recaptcha';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';

/** 실패 누적 이 횟수 이상이면 reCAPTCHA 안내 노출 (백엔드는 3회부터 강제). */
const RECAPTCHA_NOTICE_AFTER = 5;

export function LoginForm() {
  const router = useRouter();
  const executeRecaptcha = useRecaptcha();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha('login');
      await login(values.email, values.password, recaptchaToken);
      router.push('/dashboard');
    } catch (e: any) {
      setFailCount((c) => c + 1);
      setFormError(toUserMessage(e?.response?.data?.code, '로그인에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label="이메일"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {failCount >= RECAPTCHA_NOTICE_AFTER && (
        <div
          role="status"
          data-testid="recaptcha-notice"
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          보안 확인(reCAPTCHA)이 적용됩니다. 사람임이 확인되면 계속 진행됩니다.
        </div>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <Button type="submit" fullWidth size="lg" loading={submitting}>
        로그인
      </Button>

      <div className="flex justify-between text-xs text-gray-500">
        <Link href="/signup" className="hover:text-gray-700">
          회원가입
        </Link>
        <Link href="/password-reset" className="hover:text-gray-700">
          비밀번호를 잊으셨나요?
        </Link>
      </div>
    </form>
  );
}
