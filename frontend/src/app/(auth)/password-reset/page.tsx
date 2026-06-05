import { PasswordResetRequestForm } from '@/components/auth/PasswordResetRequestForm';

export default function PasswordResetPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">비밀번호 재설정</h1>
      <p className="text-sm text-gray-600">가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다.</p>
      <PasswordResetRequestForm />
    </div>
  );
}
