import { create } from 'zustand';
import { api } from '@/core/api';
import { tokenStore } from '@/core/secure-store';
import type { AuthUser, MeResponse, LoginResponse } from '@/lib/types';

interface AuthState {
  user: AuthUser | null;
  bootstrapping: boolean;
  loading: boolean;

  bootstrap: () => Promise<void>;
  login: (
    email: string,
    password: string,
    otp?: string,
  ) => Promise<{ twoFactorRequired?: boolean }>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  bootstrapping: true,
  loading: false,

  async bootstrap() {
    try {
      const token = await tokenStore.get();
      if (!token) {
        set({ user: null, bootstrapping: false });
        return;
      }
      const { data } = await api.get<MeResponse>('/auth/me');
      set({ user: data.user, bootstrapping: false });
    } catch {
      await tokenStore.clear();
      set({ user: null, bootstrapping: false });
    }
  },

  async login(email, password, otp) {
    set({ loading: true });
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
        otp: otp ?? undefined,
        device: 'mobile',
      });
      if (data.two_factor_required) {
        return { twoFactorRequired: true };
      }
      await tokenStore.set(data.token);
      const me = await api.get<MeResponse>('/auth/me');
      set({ user: me.data.user });
      return {};
    } finally {
      set({ loading: false });
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignorar errores de red al cerrar sesión */
    }
    await tokenStore.clear();
    set({ user: null });
  },
}));
