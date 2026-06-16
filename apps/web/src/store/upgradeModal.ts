import { create } from 'zustand';

interface UpgradeState {
  open:        boolean;
  feature:     string | null;        // feature key del módulo bloqueado
  requiredPlan: 'professional' | 'premium' | null;
  moduleLabel: string | null;        // ej. "Inventario", "Integraciones"
  show:  (params: { feature: string; requiredPlan: 'professional' | 'premium'; moduleLabel: string }) => void;
  close: () => void;
}

export const useUpgradeModal = create<UpgradeState>((set) => ({
  open: false,
  feature: null,
  requiredPlan: null,
  moduleLabel: null,
  show:  ({ feature, requiredPlan, moduleLabel }) => set({ open: true, feature, requiredPlan, moduleLabel }),
  close: () => set({ open: false }),
}));
