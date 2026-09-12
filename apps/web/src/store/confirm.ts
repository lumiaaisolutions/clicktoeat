'use client';

// Diálogo de confirmación con diseño (reemplaza al confirm() nativo del
// navegador). API: `const ok = await confirmAction({ title, message })`.
// El render lo hace `components/ui/ConfirmDialog.tsx`, montado una vez en el
// layout del panel. Promise-based: resuelve true (confirmar) / false (cancelar).

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmRequest {
  id: number;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

type Listener = (req: ConfirmRequest | null) => void;

let current: ConfirmRequest | null = null;
let resolver: ((v: boolean) => void) | null = null;
const listeners = new Set<Listener>();
let seq = 0;

function emit(): void { for (const l of listeners) l(current); }

export function subscribeConfirm(l: Listener): () => void {
  listeners.add(l);
  l(current);
  return () => { listeners.delete(l); };
}

export function confirmAction(opts: Omit<ConfirmRequest, 'id'>): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  // si había uno abierto, lo cancelamos
  if (resolver) { resolver(false); resolver = null; }
  current = { id: ++seq, ...opts };
  emit();
  return new Promise<boolean>((resolve) => { resolver = resolve; });
}

export function resolveConfirm(value: boolean): void {
  if (resolver) { resolver(value); resolver = null; }
  current = null;
  emit();
}
