import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">로그인</h1>
      <LoginForm />
    </div>
  );
}
