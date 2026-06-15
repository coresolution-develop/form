import type { FormStatus, FormSummary } from '@/types/form';
import type { UserRole, UserStatus } from '@/types/user';

export type ReportReason = 'SPAM' | 'PHISHING' | 'ILLEGAL' | 'PRIVACY' | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'REJECTED';

/** GET /api/admin/users 아이템 (§7.10). */
export interface AdminUserItem {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  formCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

/** GET /api/admin/users/{id} 상세 (§10.2 어뷰징 조사). */
export interface AdminUserDetail {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  plan: string | null;
  suspendedReason: string | null;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  formCount: number;
  totalResponses: number;
  forms: FormSummary[];
}

/** GET /api/admin/forms 아이템 (§7.10). */
export interface AdminFormItem {
  id: number;
  slug: string;
  title: string;
  status: FormStatus;
  ownerId: number;
  ownerEmail: string;
  responseCount: number;
  pendingReportCount: number;
  createdAt: string;
}

/** GET /api/admin/reports 아이템 (§7.10 / §10.2). */
export interface AdminReportItem {
  id: number;
  formId: number;
  formTitle: string;
  formSlug: string;
  formStatus: FormStatus;
  ownerId: number;
  ownerEmail: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  reporterUserId: number | null;
  handledBy: number | null;
  handledAt: string | null;
  pendingCountForForm: number;
  createdAt: string;
}

/** GET /api/admin/audits 아이템 (§7.10). */
export interface AdminAuditItem {
  id: number;
  adminId: number;
  adminEmail: string | null;
  action: string;
  targetType: string;
  targetId: number;
  detail: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

/** 일자별 집계 (§10.3). */
export interface DailyCount {
  day: string;
  count: number;
}

/** GET /api/admin/dashboard (§10.3). */
export interface AdminDashboard {
  todaySignups: number;
  todayResponses: number;
  pendingReports: number;
  signupsLast7Days: DailyCount[];
  responsesLast7Days: DailyCount[];
  recentAudits: AdminAuditItem[];
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: '스팸',
  PHISHING: '피싱',
  ILLEGAL: '불법 콘텐츠',
  PRIVACY: '개인정보 침해',
  OTHER: '기타',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: '대기',
  REVIEWING: '검토 중',
  RESOLVED: '처리 완료',
  REJECTED: '반려',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: '인증 대기',
  ACTIVE: '활성',
  SUSPENDED: '정지',
  DELETED: '탈퇴',
};

/** admin_audits.action 라벨 (§5.2). */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  USER_SUSPEND: '사용자 정지',
  USER_RESTORE: '사용자 복원',
  FORM_FORCE_CLOSE: '폼 강제 마감',
  REPORT_RESOLVE: '신고 처리',
};
