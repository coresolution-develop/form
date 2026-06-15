import { api } from '@/lib/api';
import type { PageResponse } from '@/types/api';
import type {
  AdminAuditItem,
  AdminDashboard,
  AdminFormItem,
  AdminReportItem,
  AdminUserDetail,
  AdminUserItem,
  ReportStatus,
} from '@/types/admin';
import type { FormDetail } from '@/types/form';
import type { UserStatus } from '@/types/user';

const ADMIN_PAGE_SIZE = 50;

// ===== 대시보드 (§10.3) =====
export async function getDashboard(): Promise<AdminDashboard> {
  const res = await api.get('/api/admin/dashboard');
  return res.data.data as AdminDashboard;
}

// ===== 사용자 (§7.10) =====
export interface AdminUserFilters {
  status?: UserStatus | null;
  email?: string | null;
}

export async function getUsers(
  filters: AdminUserFilters,
  page: number,
  size = ADMIN_PAGE_SIZE,
): Promise<PageResponse<AdminUserItem>> {
  const res = await api.get('/api/admin/users', {
    params: {
      page,
      size,
      status: filters.status || undefined,
      email: filters.email || undefined,
    },
  });
  return res.data.data as PageResponse<AdminUserItem>;
}

export async function getUserDetail(id: number): Promise<AdminUserDetail> {
  const res = await api.get(`/api/admin/users/${id}`);
  return res.data.data as AdminUserDetail;
}

export async function updateUserStatus(
  id: number,
  status: UserStatus,
  reason?: string,
): Promise<void> {
  await api.patch(`/api/admin/users/${id}/status`, { status, reason: reason ?? null });
}

// ===== 폼 (§7.10) =====
export async function getForms(
  keyword: string,
  page: number,
  size = ADMIN_PAGE_SIZE,
): Promise<PageResponse<AdminFormItem>> {
  const res = await api.get('/api/admin/forms', {
    params: { page, size, keyword: keyword || undefined },
  });
  return res.data.data as PageResponse<AdminFormItem>;
}

export async function forceCloseForm(id: number, reason: string): Promise<void> {
  await api.patch(`/api/admin/forms/${id}/force-close`, { reason });
}

/** 관리자 폼 미리보기 (상태 무관, 필드 포함). */
export async function getAdminFormDetail(id: number): Promise<FormDetail> {
  const res = await api.get(`/api/admin/forms/${id}`);
  return res.data.data as FormDetail;
}

// ===== 신고 (§7.10 / §10.2) =====
export async function getReports(
  status: ReportStatus | null,
  page: number,
  size = ADMIN_PAGE_SIZE,
): Promise<PageResponse<AdminReportItem>> {
  const res = await api.get('/api/admin/reports', {
    params: { page, size, status: status || undefined },
  });
  return res.data.data as PageResponse<AdminReportItem>;
}

export async function updateReport(
  id: number,
  status: ReportStatus,
  detail?: string,
  closeForm = false,
): Promise<void> {
  await api.patch(`/api/admin/reports/${id}`, { status, detail: detail ?? null, closeForm });
}

// ===== 감사 로그 (§7.10) =====
export async function getAudits(
  targetType: string | null,
  page: number,
  size = ADMIN_PAGE_SIZE,
): Promise<PageResponse<AdminAuditItem>> {
  const res = await api.get('/api/admin/audits', {
    params: { page, size, targetType: targetType || undefined },
  });
  return res.data.data as PageResponse<AdminAuditItem>;
}
