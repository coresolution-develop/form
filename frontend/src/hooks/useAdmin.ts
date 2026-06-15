'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  forceCloseForm,
  getAdminFormDetail,
  getAudits,
  getDashboard,
  getForms,
  getReports,
  getUserDetail,
  getUsers,
  updateReport,
  updateUserStatus,
  type AdminUserFilters,
} from '@/lib/admin';
import type { ReportStatus } from '@/types/admin';
import type { UserStatus } from '@/types/user';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: ['admin', 'dashboard'] as const,
  users: (page: number, filters: AdminUserFilters) =>
    ['admin', 'users', page, filters.status ?? '', filters.email ?? ''] as const,
  forms: (page: number, keyword: string) => ['admin', 'forms', page, keyword] as const,
  reports: (page: number, status: ReportStatus | null) =>
    ['admin', 'reports', page, status ?? ''] as const,
  audits: (page: number, targetType: string | null) =>
    ['admin', 'audits', page, targetType ?? ''] as const,
};

// ===== Queries =====
export function useAdminDashboard() {
  return useQuery({ queryKey: adminKeys.dashboard, queryFn: getDashboard });
}

export function useAdminUsers(page: number, filters: AdminUserFilters) {
  return useQuery({
    queryKey: adminKeys.users(page, filters),
    queryFn: () => getUsers(filters, page),
  });
}

export function useAdminUserDetail(id: number) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getUserDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useAdminForms(page: number, keyword: string) {
  return useQuery({
    queryKey: adminKeys.forms(page, keyword),
    queryFn: () => getForms(keyword, page),
  });
}

/** 신고 조사용 폼 미리보기 (상태 무관). id가 null이면 미조회. */
export function useAdminFormDetail(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'form', id],
    queryFn: () => getAdminFormDetail(id as number),
    enabled: id != null && id > 0,
  });
}

export function useAdminReports(page: number, status: ReportStatus | null) {
  return useQuery({
    queryKey: adminKeys.reports(page, status),
    queryFn: () => getReports(status, page),
  });
}

export function useAdminAudits(page: number, targetType: string | null) {
  return useQuery({
    queryKey: adminKeys.audits(page, targetType),
    queryFn: () => getAudits(targetType, page),
  });
}

// ===== Mutations =====
export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: UserStatus; reason?: string }) =>
      updateUserStatus(vars.id, vars.status, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
  });
}

export function useForceCloseForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason: string }) => forceCloseForm(vars.id, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'forms'] });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; status: ReportStatus; detail?: string; closeForm?: boolean }) =>
      updateReport(vars.id, vars.status, vars.detail, vars.closeForm ?? false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      qc.invalidateQueries({ queryKey: ['admin', 'forms'] });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard });
    },
  });
}
