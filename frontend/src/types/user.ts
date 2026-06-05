export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type UserPlan = 'FREE' | 'PRO' | 'TEAM';

/** 로그인/세션에 쓰는 최소 사용자 정보 (LoginResponse.user 와 일치). */
export interface User {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
}

/** GET /api/users/me 응답 (MeResponse 와 일치). */
export interface Me {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
  plan: UserPlan;
  emailVerifiedAt: string | null;
  createdAt: string;
}
