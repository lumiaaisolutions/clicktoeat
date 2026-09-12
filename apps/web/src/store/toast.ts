'use client';

// Store de toasts propio (reemplaza a `sileo`). Mantiene la API pública
// histórica: `import { toast } from '@/store/toast'` + `toast.success(text)`.
// Además soporta `warning`/`neutral` y un segundo argumento opcional
// `{ description?, duration? }`. El render lo hace `components/ui/Toaster.tsx`
// con diseño propio, z-index por encima de modales y animaciones.

export type ToastKind = 'success' | 'error' | 'info' | 'warning' | 'neutral';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  /** ms hasta auto-cierre; 0 = no se cierra solo. */
  duration: number;
}

export interface ToastOptions {
  description?: string;
  duration?: number;
}

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let seq = 0;

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4200;

function emit(): void {
  for (const l of listeners) l(items);
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  l(items);
  return () => { listeners.delete(l); };
}

export function dismiss(id: string): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function dismissAll(): void {
  items = [];
  emit();
}

function push(kind: ToastKind, title: string, opts?: ToastOptions): string {
  if (typeof window === 'undefined') return '';
  const id = `t${++seq}`;
  const item: ToastItem = {
    id,
    kind,
    title,
    description: opts?.description,
    duration: opts?.duration ?? (kind === 'error' ? 6000 : DEFAULT_DURATION),
  };
  // Más reciente arriba; tope de visibles para no tapar la pantalla.
  items = [item, ...items].slice(0, MAX_VISIBLE);
  emit();
  return id;
}

export const toast = {
  success: (text: string, opts?: ToastOptions) => push('success', text, opts),
  error:   (text: string, opts?: ToastOptions) => push('error',   text, opts),
  info:    (text: string, opts?: ToastOptions) => push('info',    text, opts),
  warning: (text: string, opts?: ToastOptions) => push('warning', text, opts),
  neutral: (text: string, opts?: ToastOptions) => push('neutral', text, opts),
  dismiss,
  dismissAll,
};

// Compat shim para call sites legacy que importan `useToast`.
export function useToast() {
  return {
    toasts: [] as ToastItem[],
    push(kind: ToastKind, text: string) { push(kind, text); },
    dismiss(id: string) { dismiss(id); },
  };
}
