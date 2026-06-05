import { create } from 'zustand';

type User = { id: number; email: string; nickname: string; role: 'USER' | 'ADMIN' };

type AuthState = {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (t: string) => void;
  setUser: (u: User) => void;
  setAuth: (t: string, u: User) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAccessToken: (t) => set({ accessToken: t }),
  setUser: (u) => set({ user: u }),
  setAuth: (t, u) => set({ accessToken: t, user: u }),
  clear: () => set({ accessToken: null, user: null }),
}));
