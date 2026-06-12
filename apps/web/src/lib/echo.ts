'use client';

/**
 * Cliente Laravel Echo + Pusher para tiempo real.
 *
 * Activación: setear `NEXT_PUBLIC_PUSHER_KEY` y `NEXT_PUBLIC_PUSHER_CLUSTER`
 * en `.env.production` (y agregar `pusher-js` + `laravel-echo` al package.json).
 *
 * Si no están configuradas → `echo` es `null` y `subscribeToLocalEvents`
 * NO conecta nada — frontend sigue dependiendo del polling existente.
 *
 * Ver: docs/runbook/integrar-reverb.md
 */

import { tokenStore } from './api';

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

export const isRealtimeEnabled = Boolean(PUSHER_KEY && PUSHER_CLUSTER);

/**
 * Singleton echo instance. Null si no hay Pusher configurado.
 * Se inicializa lazy en la primera llamada a getEcho().
 */
let echoInstance: any = null;

export async function getEcho(): Promise<any | null> {
  if (!isRealtimeEnabled) return null;
  if (echoInstance) return echoInstance;
  if (typeof window === 'undefined') return null;

  try {
    // Dynamic imports — sólo se descargan los SDKs si efectivamente se usan
    const { default: Echo } = await import('laravel-echo');
    const Pusher = (await import('pusher-js')).default;

    (window as any).Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: PUSHER_KEY,
      cluster: PUSHER_CLUSTER,
      forceTLS: true,
      authEndpoint: `${API_URL}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${tokenStore.get() ?? ''}`,
          Accept: 'application/json',
        },
      },
    });

    return echoInstance;
  } catch (err) {
    // pusher-js / laravel-echo no instalados — comportamiento esperado en setups
    // que aún no activaron tiempo real.
    console.warn('[echo] pusher-js o laravel-echo no instalados. Frontend usa polling.');
    return null;
  }
}

/**
 * Suscribirse al canal privado del local y escuchar `PedidoCreado`.
 * Retorna unsubscribe.
 *
 * Si no hay realtime configurado, retorna noop.
 */
export async function subscribeToLocalEvents(
  localId: number,
  onPedidoCreado: (data: {
    pedido_id: number;
    codigo: string;
    cliente: string;
    total: number;
    metodo_entrega: string;
    estado: string;
    created_at: string;
  }) => void,
): Promise<() => void> {
  const echo = await getEcho();
  if (!echo) return () => {};

  const channel = echo.private(`local.${localId}`);
  channel.listen('.pedido.creado', onPedidoCreado);

  return () => {
    channel.stopListening('.pedido.creado');
    echo.leave(`local.${localId}`);
  };
}
