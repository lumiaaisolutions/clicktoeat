'use client';

/**
 * Stub para Laravel Echo + Pusher.
 *
 * Hasta activar broadcasting, este módulo no hace nada. El frontend depende
 * del polling existente. Cuando se active:
 *
 *   1. npm install pusher-js laravel-echo
 *   2. setear NEXT_PUBLIC_PUSHER_KEY y NEXT_PUBLIC_PUSHER_CLUSTER en .env.production
 *   3. reemplazar este archivo con la implementación documentada en
 *      docs/runbook/integrar-reverb.md
 *
 * Razón por la que está como stub: webpack en `next build` resuelve los
 * `import('laravel-echo')` aunque sean dinámicos y aunque tengan
 * `@ts-expect-error` — falla en build si el paquete no está en package.json.
 */

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const isRealtimeEnabled = Boolean(PUSHER_KEY && PUSHER_CLUSTER);

export async function getEcho(): Promise<unknown | null> {
  return null;
}

export async function subscribeToLocalEvents(
  _localId: number,
  _onPedidoCreado: (data: {
    pedido_id: number;
    codigo: string;
    cliente: string;
    total: number;
    metodo_entrega: string;
    estado: string;
    created_at: string;
  }) => void,
): Promise<() => void> {
  return () => {};
}
