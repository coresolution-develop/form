'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { requestPasswordReset } from '@/lib/auth';
import { toUserMessage } from '@/lib/errorMessage';
import { useRecaptcha } from '@/lib/recaptcha';
import { passwordResetRequestSchema, type PasswordResetRequestValues } from '@/lib/validation/auth';

export function PasswordResetRequestForm() {
  const executeRecaptcha = useRecaptcha();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetRequestValues>({ resolver: zodResolver(passwordResetRequestSchema) });

  const onSubmit = async (values: PasswordResetRequestValues) => {
    setSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha('password_reset');
      await requestPasswordReset(values.email, recaptchaToken);
      setSent(true);
      toast('비밀번호 재설정 메일을 보냈습니다.', 'success');
    } catch (e: any) {
      toast(toUserMessage(e?.response?.data?.code, '요청에 실패했습니다.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <p className="text-sm text-gray-700">
        입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. (해당 계정이 존재하는 경우)
        <br />
        메일함을 확인해주세요.
      </p>
    );
  }

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
      <Button type="submit" fullWidth size="lg" loading={submitting}>
        재설정 메일 보내기
      </Button>
    </form>
  );
}
