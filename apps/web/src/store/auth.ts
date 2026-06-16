'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, tokenStore } from '@/lib/api';
import { usePlan, type PlanInfo } from '@/store/plan';

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'super_admin' | 'owner' | 'staff';
  /** Módulos a los que el user puede acceder. Owner = todos. */
  permisos?: string[];
  local_id: number | null;
}

interface MePayload { user: AuthUser; plan?: PlanInfo | null }
interface LoginPayload { user: AuthUser; token: string }

interface AuthState {
  user: AuthUser | null;
  loading: boolean;

  login: (email: string, password: string, otp?: string) => Promise<{ twoFactorRequired?: boolean }>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setTokenAndHydrate: (token: string) => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,

      async login(email, password, otp) {
        set({ loading: true });
        try {
          const { data } = await api.post<LoginPayload & { two_factor_required?: boolean }>('/auth/login', {
            email,
            password,
            otp: otp ?? undefined,
            device: 'web',
          });
          // Servidor pidió 2FA → no hay token todavía
          if ((data as any).two_factor_required) {
            return { twoFactorRequired: true };
          }
          tokenStore.set(data.token);
          set({ user: data.user });
          try {
            const me = await api.get<MePayload>('/auth/me');
            usePlan.getState().setPlan(me.data.plan ?? null);
          } catch { /* ignore */ }
          return {};
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
        usePlan.getState().setPlan(null);
        set({ user: null });
      },

      async hydrate() {
        if (!tokenStore.get()) return;
        try {
          const { data } = await api.get<MePayload>('/auth/me');
          set({ user: data.user });
          usePlan.getState().setPlan(data.plan ?? null);
        } catch {
          tokenStore.clear();
          usePlan.getState().setPlan(null);
          set({ user: null });
        }
      },

      async setTokenAndHydrate(token) {
        tokenStore.set(token);
        try {
          const { data } = await api.get<MePayload>('/auth/me');
          set({ user: data.user });
          usePlan.getState().setPlan(data.plan ?? null);
        } catch {
          tokenStore.clear();
          usePlan.getState().setPlan(null);
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
