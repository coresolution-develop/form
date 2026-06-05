'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TermsAgreement } from '@/components/auth/TermsAgreement';
import { signup } from '@/lib/auth';
import { toUserMessage } from '@/lib/errorMessage';
import { useRecaptcha } from '@/lib/recaptcha';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';

export function SignupForm() {
  const router = useRouter();
  const executeRecaptcha = useRecaptcha();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { marketingAgreed: false, serviceAgreed: false, privacyAgreed: false },
  });

  const serviceAgreed = watch('serviceAgreed');
  const privacyAgreed = watch('privacyAgreed');
  const marketingAgreed = watch('marketingAgreed');

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha('signup');
      await signup({
        email: values.email,
        password: values.password,
        nickname: values.nickname,
        recaptchaToken,
        termsAgreement: {
          service: values.serviceAgreed,
          privacy: values.privacyAgreed,
          marketing: values.marketingAgreed,
        },
      });
      router.push('/signup/sent');
    } catch (e: any) {
      setFormError(toUserMessage(e?.response?.data?.code, '회원가입에 실패했습니다.'));
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
        autoComplete="new-password"
        helperText="8자 이상, 영문 대/소문자·숫자·특수문자 중 3종류 이상"
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label="닉네임"
        type="text"
        autoComplete="nickname"
        error={errors.nickname?.message}
        {...register('nickname')}
      />

      <TermsAgreement
        service={!!serviceAgreed}
        privacy={!!privacyAgreed}
        marketing={!!marketingAgreed}
        onChange={(field, value) => {
          if (field === 'service') setValue('serviceAgreed', value, { shouldValidate: true });
          if (field === 'privacy') setValue('privacyAgreed', value, { shouldValidate: true });
          if (field === 'marketing') setValue('marketingAgreed', value, { shouldValidate: true });
        }}
        serviceError={errors.serviceAgreed?.message}
        privacyError={errors.privacyAgreed?.message}
      />

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <Button type="submit" fullWidth size="lg" loading={submitting} disabled={!serviceAgreed || !privacyAgreed}>
        가입하기
      </Button>
    </form>
  );
}
