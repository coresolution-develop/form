'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { confirmPasswordReset } from '@/lib/auth';
import { toUserMessage } from '@/lib/errorMessage';
import { passwordResetConfirmSchema, type PasswordResetConfirmValues } from '@/lib/validation/auth';

export function PasswordResetConfirmForm({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetConfirmValues>({ resolver: zodResolver(passwordResetConfirmSchema) });

  const onSubmit = async (values: PasswordResetConfirmValues) => {
    setFormError(null);
    if (!token) {
      setFormError('유효하지 않은 링크입니다.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, values.newPassword);
      // 자동 로그인 X — 로그인 페이지로 이동 + 토스트
      toast('비밀번호가 변경되었습니다. 다시 로그인해주세요.', 'success');
      router.replace('/login');
    } catch (e: any) {
      setFormError(toUserMessage(e?.response?.data?.code, '비밀번호 변경에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        label="새 비밀번호"
        type="password"
        autoComplete="new-password"
        helperText="8자 이상, 영문 대/소문자·숫자·특수문자 중 3종류 이상"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input
        label="새 비밀번호 확인"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <Button type="submit" fullWidth size="lg" loading={submitting}>
        비밀번호 변경
      </Button>
    </form>
  );
}
