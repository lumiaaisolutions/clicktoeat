'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, tokenStore } from '@/lib/api';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'owner' | 'staff';
  /** Módulos a los que el user puede acceder. Owner = todos. */
  permisos?: string[];
  local_id: number | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,

      async login(email, password) {
        set({ loading: true });
        try {
          const { data } = await api.post<{ user: AuthUser; token: string }>('/auth/login', {
            email,
            password,
            device: 'web',
          });
          tokenStore.set(data.token);
          set({ user: data.user });
        } finally {
          set({ loading: false });
        }
      },

      async logout() {
        try {
          await api.post('/auth/logout');
        } catch {
          /* ignore network errors on logout */
        }
        tokenStore.clear();
        set({ user: null });
      },

      async hydrate() {
        if (!tokenStore.get()) return;
        try {
          const { data } = await api.get<{ user: AuthUser }>('/auth/me');
          set({ user: data.user });
        } catch {
          tokenStore.clear();
          set({ user: null });
        }
      },
    }),
    {
      name: 'clickeat:auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
