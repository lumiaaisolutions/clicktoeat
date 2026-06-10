'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificaciones } from '@/store/notificaciones';
import { cn } from '@/lib/utils';

export function NotificacionesBell() {
  const { items, noLeidas, pedidosNuevos, startPolling, stopPolling, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-xl hover:bg-line/50 grid place-items-center"
        aria-label="Notificaciones"
      >
        <span className="text-lg">🔔</span>
        {(noLeidas + pedidosNuevos.length) > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center">
            {(noLeidas + pedidosNuevos.length) > 99 ? '99+' : noLeidas + pedidosNuevos.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex">
            <button
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              className="flex-1 bg-black/30"
            />
            <motion.aside
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-w-md bg-white h-full flex flex-col shadow-glass"
            >
              <header className="px-5 py-4 border-b border-line flex items-center justify-between">
                <h3 className="ce-display font-bold text-xl">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {noLeidas > 0 && (
                    <button
                      onClick={marcarTodasLeidas}
                      className="text-xs text-muted hover:text-ink underline"
                    >
                      Marcar todas
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} aria-label="Cerrar" className="w-9 h-9 rounded-xl hover:bg-line/50">✕</button>
                </div>
              </header>

              <div className="flex-1 overflow-auto">
                {/* Pedidos nuevos */}
                {pedidosNuevos.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-700">🛎 Pedidos nuevos</span>
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center">
                        {pedidosNuevos.length}
                      </span>
                    </div>
                    <ul className="divide-y divide-line">
                      {pedidosNuevos.map((p) => (
                        <li key={p.id} className="p-4 bg-red-50/40 hover:bg-red-50/70 cursor-pointer" onClick={() => { setOpen(false); router.push('/admin/pedidos'); }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{p.codigo}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">NUEVO</span>
                              </div>
                              <p className="text-xs text-muted mt-0.5 truncate">{p.cliente_nombre}</p>
                              <p className="text-xs text-muted">{p.metodo_entrega === 'delivery' ? '🚚 Delivery' : p.metodo_entrega === 'pickup' ? '🏃 Pickup' : '🏠 Sucursal'} · ${p.total.toFixed(2)}</p>
                            </div>
                            <p className="text-[10px] text-muted shrink-0">
                              {new Date(p.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notificaciones */}
                <ul className="divide-y divide-line">
                  {items.length === 0 && pedidosNuevos.length === 0 ? (
                    <li className="p-10 text-center text-muted text-sm">Sin notificaciones todavía.</li>
                  ) : items.length === 0 ? null : (
                    items.map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          'p-4 cursor-pointer hover:bg-line/20',
                          !n.leida && 'bg-amber-50/50',
                        )}
                        onClick={() => { marcarLeida(n.id); setOpen(false); router.push('/admin/pedidos'); }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{iconFor(n.tipo)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{n.titulo}</p>
                              {!n.leida && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted mt-0.5">{n.mensaje}</p>
                            <p className="text-[10px] text-muted mt-1">
                              {new Date(n.created_at).toLocaleString('es-MX')}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function iconFor(tipo: string): string {
  switch (tipo) {
    case 'bajo_stock':   return '⚠️';
    case 'pedido':       return '🛎';
    case 'nuevo_pedido': return '🛎';
    default:             return '🔔';
  }
}
