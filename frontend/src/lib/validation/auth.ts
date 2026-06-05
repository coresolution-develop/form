import { z } from 'zod';

/** §6.10 비밀번호 정책: 8~64자, 영문 대/소/숫자/특수 중 3종 이상. */
function passwordKinds(v: string): number {
  let kinds = 0;
  if (/[a-z]/.test(v)) kinds++;
  if (/[A-Z]/.test(v)) kinds++;
  if (/\d/.test(v)) kinds++;
  if (/[^a-zA-Z0-9]/.test(v)) kinds++;
  return kinds;
}

const passwordField = z
  .string()
  .min(8, '8자 이상 입력해주세요.')
  .max(64, '64자 이하로 입력해주세요.')
  .refine((v) => passwordKinds(v) >= 3, '영문 대/소문자, 숫자, 특수문자 중 3종류 이상 포함해야 합니다.');

export const signupSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: passwordField,
  nickname: z.string().min(1, '닉네임을 입력해주세요.').max(50, '닉네임은 50자 이하여야 합니다.'),
  serviceAgreed: z.boolean().refine((v) => v === true, { message: '필수 약관에 동의해주세요.' }),
  privacyAgreed: z.boolean().refine((v) => v === true, { message: '필수 약관에 동의해주세요.' }),
  marketingAgreed: z.boolean(),
});
export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const passwordResetRequestSchema = z.object({
  email: z.string().email('이메일 형식이 올바르지 않습니다.'),
});
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });
export type PasswordResetConfirmValues = z.infer<typeof passwordResetConfirmSchema>;
