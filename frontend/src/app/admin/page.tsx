'use client';

import Link from 'next/link';
import { AuditTable } from '@/components/admin/AuditTable';
import { DailyTrendChart } from '@/components/admin/DailyTrendChart';
import { StatCard } from '@/components/admin/StatCard';
import { Spinner } from '@/components/ui/Spinner';
import { useAdminDashboard } from '@/hooks/useAdmin';

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 text-brand">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="py-20 text-center text-gray-500">대시보드를 불러올 수 없습니다.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      {/* 위젯 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="오늘 가입자" value={data.todaySignups} />
        <StatCard label="오늘 응답" value={data.todayResponses} />
        <StatCard label="대기 중 신고" value={data.pendingReports} highlight />
      </div>

      {data.pendingReports > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>처리 대기 중인 신고가 {data.pendingReports}건 있습니다.</span>
          <Link href="/admin/reports" className="font-medium underline">
            신고 처리하기
          </Link>
        </div>
      )}

      {/* 최근 7일 추이 */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">최근 7일 가입·응답</h2>
        <DailyTrendChart signups={data.signupsLast7Days} responses={data.responsesLast7Days} />
      </section>

      {/* 최근 감사 로그 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">최근 관리 작업</h2>
          <Link href="/admin/audits" className="text-sm text-brand hover:underline">
            전체 보기
          </Link>
        </div>
        <AuditTable audits={data.recentAudits} compact />
      </section>
    </div>
  );
}
