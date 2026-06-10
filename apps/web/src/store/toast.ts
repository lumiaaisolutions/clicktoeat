'use client';

import { create } from 'zustand';

export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastItem['kind'], text: string) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push(kind, text) {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (text: string) => useToast.getState().push('success', text),
  error:   (text: string) => useToast.getState().push('error',   text),
  info:    (text: string) => useToast.getState().push('info',    text),
};
