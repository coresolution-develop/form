import { Spinner } from '@/components/ui/Spinner';

/** 라우트 전환 시 전역 로딩 (§9.1). */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-blue-600">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
