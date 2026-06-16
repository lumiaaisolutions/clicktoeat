'use client';

import { create } from 'zustand';

export type PlanSlug   = 'essential' | 'professional' | 'premium';
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface PlanInfo {
  slug:    PlanSlug;
  nombre:  string;
  features: string[];
  limits: {
    productos:  number | null;
    categorias: number | null;
    staff:      number | null;
  };
  status: PlanStatus;
  trial_ends_at:          string | null;
  current_period_ends_at: string | null;
  is_active: boolean;
}

interface PlanState {
  plan: PlanInfo | null;
  setPlan(p: PlanInfo | null): void;
  /** El plan está vigente AHORA — incluye trialing y active. */
  isActive(): boolean;
  /** El plan está vigente Y la feature está en la lista. */
  has(feature: string): boolean;
  isTrialing(): boolean;
  isPastDue(): boolean;
  daysUntilTrialEnd(): number | null;
}

export const usePlan = create<PlanState>((set, get) => ({
  plan: null,

  setPlan: (p) => set({ plan: p }),

  isActive: () => !!get().plan?.is_active,

  has: (feature) => {
    const p = get().plan;
    if (!p || !p.is_active) return false;
    return p.features.includes(feature);
  },

  isTrialing: () => get().plan?.status === 'trialing',
  isPastDue:  () => get().plan?.status === 'past_due',

  daysUntilTrialEnd: () => {
    const t = get().plan?.trial_ends_at;
    if (!t) return null;
    const ms = new Date(t).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  },
}));

/** Feature key constants — espejo de App\Support\Features (PHP). */
export const Features = {
  BRANDING_BASICO:    'branding_basico',
  BRANDING_AVANZADO:  'branding_avanzado',
  INVENTARIO:         'inventario',
  RECETAS:            'recetas',
  COMPRAS:            'compras',
  METRICAS_BASICAS:   'metricas_basicas',
  METRICAS_AVANZADAS: 'metricas_avanzadas',
  POS:                'pos',
  QR_PERSONALIZADO:   'qr_personalizado',
  NOTIFICACIONES:     'notificaciones',
  STAFF_MULTI:        'staff_multi',
  AUDIT_LOG:          'audit_log',
  RESTORE:            'restore',
} as const;
