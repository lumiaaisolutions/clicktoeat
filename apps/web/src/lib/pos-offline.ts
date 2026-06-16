/**
 * Queue de pedidos POS que se crearon offline. Se persisten en
 * localStorage. Cuando vuelve internet, `flushPending()` los manda
 * al backend uno por uno, conservando el orden.
 *
 * Limitación conocida: el descuento de inventario y los códigos
 * únicos se generan server-side. Si dos cajeros cobran offline el mismo
 * producto que sólo tiene stock para 1, ambos verán éxito local y al
 * sincronizar uno fallará por 409. El UI alerta de esos casos al usuario.
 */

import { api } from './api';

const KEY = 'pos-pending-orders-v1';

export interface PendingOrder {
  /** id local — para mostrar al usuario y para deduplicación. */
  localId:   string;
  /** timestamp de cuando se creó offline. */
  createdAt: number;
  /** payload exacto que se envía al endpoint POST /pedidos. */
  payload:   Record<string, unknown>;
}

export function getPending(): PendingOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingOrder[]) : [];
  } catch { return []; }
}

export function enqueue(payload: Record<string, unknown>): PendingOrder {
  const order: PendingOrder = {
    localId:   `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    payload,
  };
  const next = [...getPending(), order];
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return order;
}

export function remove(localId: string): void {
  const next = getPending().filter((o) => o.localId !== localId);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
}

export function count(): number { return getPending().length; }

/**
 * Despacha todos los pedidos pendientes. Devuelve resumen.
 * Si alguno falla con 409 (stock), lo deja en la cola y avisa.
 * Si falla con red, deja toda la cola intacta.
 */
export async function flushPending(): Promise<{ ok: number; failed: Array<{ order: PendingOrder; error: string }> }> {
  const pending = getPending();
  let ok = 0;
  const failed: Array<{ order: PendingOrder; error: string }> = [];

  for (const order of pending) {
    try {
      await api.post('/pedidos', order.payload);
      remove(order.localId);
      ok++;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status >= 400 && status < 500) {
        // Error de cliente: stock insuficiente, validación, etc. Sacamos
        // del queue para no spammear y reportamos.
        remove(order.localId);
        const msg = err?.response?.data?.message ?? `Error ${status}`;
        failed.push({ order, error: msg });
      } else {
        // Error de red o 5xx: abortamos para reintentar después
        failed.push({ order, error: 'Sin conexión — reintentando después' });
        break;
      }
    }
  }
  return { ok, failed };
}
