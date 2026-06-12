'use client';

import { create } from 'zustand';
import { api } from '@/lib/api';
import { isRealtimeEnabled, subscribeToLocalEvents } from '@/lib/echo';
import type { Notificacion, Pedido } from '@/lib/types';

interface NotificacionesState {
  items: Notificacion[];
  noLeidas: number;
  pedidosNuevos: Pedido[];
  loading: boolean;
  pollHandle: ReturnType<typeof setInterval> | null;
  realtimeUnsubscribe: (() => void) | null;

  refresh: () => Promise<void>;
  marcarLeida: (id: number) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  startPolling: (localId?: number) => void;
  stopPolling: () => void;
}

export const useNotificaciones = create<NotificacionesState>((set, get) => ({
  items: [],
  noLeidas: 0,
  pedidosNuevos: [],
  loading: false,
  pollHandle: null,
  realtimeUnsubscribe: null,

  async refresh() {
    set({ loading: true });
    try {
      const { data } = await api.get<{
        data: Notificacion[];
        no_leidas: number;
        pedidos_activos: Pedido[];
      }>('/notificaciones');

      const pedidosNuevos = (data.pedidos_activos ?? []).filter((p) => p.estado === 'nuevo');

      set({
        items: data.data ?? [],
        noLeidas: data.no_leidas ?? 0,
        pedidosNuevos,
      });
    } catch {
      // Silenciosamente — un usuario sin tenant puede no tener notificaciones
    } finally {
      set({ loading: false });
    }
  },

  async marcarLeida(id) {
    try {
      await api.post(`/notificaciones/${id}/leer`);
      set((s) => ({
        items: s.items.map((n) => (n.id === id ? { ...n, leida: true, leida_at: new Date().toISOString() } : n)),
        noLeidas: Math.max(0, s.noLeidas - 1),
      }));
    } catch { /* ignore */ }
  },

  async marcarTodasLeidas() {
    try {
      await api.post('/notificaciones/leer-todas');
      set((s) => ({
        items: s.items.map((n) => ({ ...n, leida: true, leida_at: new Date().toISOString() })),
        noLeidas: 0,
      }));
    } catch { /* ignore */ }
  },

  startPolling(localId) {
    if (get().pollHandle) return;
    get().refresh();

    // Si Pusher está configurado + tenemos localId, suscribir al canal del local.
    // Mantiene un polling de fallback cada 5 min en lugar de 30s.
    // Si Pusher NO está configurado, polling cada 30s como siempre.
    if (isRealtimeEnabled && localId) {
      subscribeToLocalEvents(localId, () => {
        // Cualquier evento del local → refresh para traer detalles + recalcular pedidos nuevos
        get().refresh();
      }).then((unsubscribe) => set({ realtimeUnsubscribe: unsubscribe }));

      const handle = setInterval(() => get().refresh(), 300_000); // heartbeat 5 min
      set({ pollHandle: handle });
    } else {
      const handle = setInterval(() => get().refresh(), 30_000);
      set({ pollHandle: handle });
    }
  },

  stopPolling() {
    const handle = get().pollHandle;
    if (handle) clearInterval(handle);

    const unsub = get().realtimeUnsubscribe;
    if (unsub) unsub();

    set({ pollHandle: null, realtimeUnsubscribe: null });
  },
}));
