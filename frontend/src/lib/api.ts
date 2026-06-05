import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const original = error.config!;
    const code = error.response?.data?.code as string | undefined;

    if (error.response?.status === 401 && code === 'UNAUTHORIZED' && !(original as any)._retry) {
      (original as any)._retry = true;
      try {
        refreshing ??= refresh();
        const newToken = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        useAuthStore.getState().clear();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  },
);

async function refresh(): Promise<string> {
  const res = await axios.post(
    `${API_URL}/api/auth/refresh`,
    {},
    { withCredentials: true },
  );
  const token = res.data?.data?.accessToken as string;
  useAuthStore.getState().setAccessToken(token);
  return token;
}
