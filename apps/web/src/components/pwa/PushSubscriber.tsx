'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

/**
 * Cuando el owner/staff está logueado y dio permiso de notificación, registra
 * la suscripción Push del browser con el API. Idempotente: si ya está suscrito
 * el endpoint, el backend lo updateOrCreates. Si el usuario revoca el permiso
 * o desactiva el SW, no rompe nada.
 */
export function PushSubscriber() {
  const user = useAuth((s) => s.user);

  useEffect(() => {
    if (!user || user.rol === 'super_admin') return;
    if (!PUBLIC_KEY) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as BufferSource,
          });
        }
        if (cancelled) return;
        const json = sub.toJSON();
        await api.post('/push/subscribe', {
          endpoint: json.endpoint,
          keys: json.keys,
        });
      } catch { /* silencioso — sin notificaciones push, queda el polling */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
