'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import type { Paginated, Pedido } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { useLivePedidos } from '@/store/livePedidos';
import { toast } from '@/store/toast';

const POLL_MS = 15_000;

/**
 * Polea /pedidos cada 15s mientras el panel está visible. Cuando detecta
 * pedidos con id > lastSeenId:
 *   - Suma al contador de "unread" (badge en sidebar).
 *   - Reproduce un beep corto.
 *   - Muestra una notificación del navegador (si el usuario dio permiso).
 *   - Levanta un toast como fallback siempre.
 *
 * No corre si:
 *   - No hay usuario logueado.
 *   - El usuario es super_admin (no maneja pedidos directamente).
 *   - El documento está oculto (tab en background).
 *
 * Se monta una sola vez desde el AdminLayout.
 */
export function LivePedidosPoller() {
  const user      = useAuth((s) => s.user);
  const seed      = useLivePedidos((s) => s.seed);
  const bump      = useLivePedidos((s) => s.bump);
  const pathname  = usePathname();
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const lastIdRef = useRef<number | null>(null);

  const onPedidosPage = pathname?.startsWith('/admin/pedidos') ?? false;

  // Pedir permiso de notificación una sola vez tras login (no bloquear UI).
  useEffect(() => {
    if (!user || user.rol === 'super_admin') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const t = setTimeout(() => { Notification.requestPermission().catch(() => {}); }, 4000);
      return () => clearTimeout(t);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.rol === 'super_admin') return;

    let alive  = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      try {
        const { data } = await api.get<Paginated<Pedido>>('/pedidos', {
          params: { per_page: 5, sort: '-id' },
        });
        const lista = data.data ?? [];
        if (!lista.length) {
          timer = setTimeout(tick, POLL_MS);
          return;
        }
        const maxId = Math.max(...lista.map((p) => p.id));

        if (lastIdRef.current == null) {
          // Primer pase: solo siembra cursor, no notifica.
          lastIdRef.current = maxId;
          seed(maxId);
        } else if (maxId > lastIdRef.current) {
          const nuevos = lista.filter((p) => p.id > (lastIdRef.current ?? 0));
          lastIdRef.current = maxId;
          bump(nuevos.length, maxId);
          notify(nuevos[0], nuevos.length, onPedidosPage);
          beep(audioRef.current);
        }
      } catch { /* network blip — reintenta en el siguiente tick */ }
      timer = setTimeout(tick, POLL_MS);
    };

    // Primer disparo inmediato (siembra el cursor)
    tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [user, seed, bump, onPedidosPage]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      src="data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YaAAAACEgIWBhoKHg4iEiYWKhouHi4iLiYqKiYuIjIeNho6FjoSPg4+CkIGRgJF/kn6SfZN8k3uUepR5lXiVd5Z2lnWXdJdzmHKYcZlxmW+abpttnG2cbJ1qnmqfaJ9nn2agZqFkomKjYaRgpV+lXqZdp1ynW6haqVmqWatXrFatVa5UrlSvU7BTsVKxUbJQs0+0TrVNtkx="
      aria-hidden
      style={{ display: 'none' }}
    />
  );
}

function notify(pedido: Pedido | undefined, count: number, onPedidosPage: boolean) {
  const titulo = count === 1
    ? `Nuevo pedido${pedido?.codigo ? ' ' + pedido.codigo : ''}`
    : `${count} pedidos nuevos`;
  const body = pedido
    ? `${pedido.cliente_nombre ?? 'Cliente'} · $${Number(pedido.total ?? 0).toFixed(2)}`
    : 'Revisa el panel de pedidos.';

  // Toast siempre — funciona aunque no haya permiso de notif del navegador
  toast.success(`${titulo} — ${body}`);

  if (onPedidosPage) return; // ya está mirando la lista
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const n = new Notification(titulo, {
      body,
      icon: '/favicon.svg',
      tag:  'live-pedidos',
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/admin/pedidos';
      n.close();
    };
  } catch { /* algunos browsers bloquean si la pestaña no está activa */ }
}

function beep(audio: HTMLAudioElement | null) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch { /* autoplay blocked — ignorar */ }
}
