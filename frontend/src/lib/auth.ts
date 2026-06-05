import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type {
  AccessTokenResponse,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '@/types/auth';
import type { Me, User } from '@/types/user';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/** ApiResponse<T> 봉투에서 data를 꺼낸다. */
function unwrap<T>(envelope: { success: boolean; data?: T }): T {
  return envelope.data as T;
}

export async function signup(req: SignupRequest): Promise<SignupResponse> {
  const res = await api.post('/api/auth/signup', req);
  return unwrap<SignupResponse>(res.data);
}

/** 이메일 인증 → 자동 로그인 (accessToken + Set-Cookie). authStore 채움. */
export async function verifyEmail(token: string): Promise<LoginResponse> {
  const res = await api.post('/api/auth/verify-email', { token });
  const data = unwrap<LoginResponse>(res.data);
  useAuthStore.getState().setAuth(data.accessToken, data.user);
  return data;
}

export async function resendVerification(email: string): Promise<void> {
  await api.post('/api/auth/resend-verification', { email });
}

export async function login(
  email: string,
  password: string,
  recaptchaToken: string,
): Promise<LoginResponse> {
  const res = await api.post('/api/auth/login', { email, password, recaptchaToken });
  const data = unwrap<LoginResponse>(res.data);
  useAuthStore.getState().setAuth(data.accessToken, data.user);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout', {});
  } finally {
    useAuthStore.getState().clear();
  }
}

export async function requestPasswordReset(email: string, recaptchaToken: string): Promise<void> {
  await api.post('/api/auth/password-reset/request', { email, recaptchaToken });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/password-reset/confirm', { token, newPassword });
}

export async function getMe(): Promise<Me> {
  const res = await api.get('/api/users/me');
  return unwrap<Me>(res.data);
}

/**
 * 세션 복구용 refresh. interceptor 재귀를 피하기 위해 plain axios로 호출하고,
 * 성공 시 accessToken을 store에 저장한다. (useBootstrap에서 사용)
 */
export async function refreshSession(): Promise<string> {
  const res = await axios.post(
    `${API_URL}/api/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const token = unwrap<AccessTokenResponse>(res.data).accessToken;
  useAuthStore.getState().setAccessToken(token);
  return token;
}

/** Me → store User(subset) 변환. */
export function toUser(me: Me): User {
  return { id: me.id, email: me.email, nickname: me.nickname, role: me.role };
}
