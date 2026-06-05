import { SignupForm } from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">회원가입</h1>
      <SignupForm />
    </div>
  );
}
