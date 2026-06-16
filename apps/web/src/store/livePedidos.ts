import { create } from 'zustand';

interface LivePedidosState {
  /** Cantidad de pedidos NUEVOS desde la última vez que el owner los vio. */
  unread: number;
  /** ID del pedido más reciente conocido. Sirve como cursor. */
  lastSeenId: number | null;
  /** Marca el último pedido como visto (al entrar a /admin/pedidos). */
  markAllRead: () => void;
  /** Llamada por el poller cuando llegan pedidos nuevos. */
  bump: (count: number, latestId: number) => void;
  /** Setea el cursor inicial sin marcar como nuevos (al cargar la página). */
  seed: (latestId: number) => void;
}

export const useLivePedidos = create<LivePedidosState>((set) => ({
  unread:     0,
  lastSeenId: null,
  markAllRead: () => set({ unread: 0 }),
  bump: (count, latestId) =>
    set((s) => ({ unread: s.unread + count, lastSeenId: latestId })),
  seed: (latestId) =>
    set((s) => ({ lastSeenId: s.lastSeenId ?? latestId })),
}));
