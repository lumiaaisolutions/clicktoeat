'use client';

// Adapter sobre `sileo` que mantiene la misma API pública que el toast store
// anterior. Los call sites (`import { toast } from '@/store/toast'` +
// `toast.success(text)`) no cambian.
//
// IMPORTANTE — lazy dynamic import:
// `sileo/dist/index.mjs` invoca `__insertCSS()` al top-level del módulo, y
// `motion@12` (su dep) también tiene side effects al cargar. Aunque la
// directiva 'use client' del paquete debería evitar que se evalúe en server,
// el bundler de Next.js 14.2.x `output: 'standalone'` no siempre respeta el
// boundary para paquetes de node_modules → se cuela al runtime de Passenger
// (Node sin DOM) → crash al boot, HTTP 503.
//
// Solución: nunca importar `sileo` a top level. Cargarlo bajo demanda dentro
// de los handlers, que sólo se invocan desde el cliente.

export interface ToastItem {
  id: string;
  kind: 'success' | 'error' | 'info';
  text: string;
}

async function show(kind: 'success' | 'error' | 'info', text: string): Promise<void> {
  if (typeof window === 'undefined') return; // safety net
  const { sileo } = await import('sileo');
  sileo[kind]({ title: text });
}

export const toast = {
  success: (text: string) => { void show('success', text); },
  error:   (text: string) => { void show('error',   text); },
  info:    (text: string) => { void show('info',    text); },
};

// Compat shim para call sites legacy que importan `useToast`. Sileo gestiona
// su propio estado, así que devolvemos un stub que sólo dispara los toasts.
export function useToast() {
  return {
    toasts: [] as ToastItem[],
    push(kind: ToastItem['kind'], text: string) {
      void show(kind, text);
    },
    dismiss(_id: string) {
      // sileo gestiona dismiss internamente
    },
  };
}
