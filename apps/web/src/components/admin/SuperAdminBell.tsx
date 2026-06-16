'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';

interface Notif {
  id: string;
  tipo: 'ticket' | 'nuevo_local' | 'pago_fallido' | string;
  titulo: string;
  mensaje: string;
  url: string;
  created_at: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

const DISMISS_KEY = 'ce-super-notif-dismissed';

export function SuperAdminBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Carga dismissed de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch {}
  }, []);

  // Polling cada 60s
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get<{ data: Notif[] }>('/admin/notificaciones');
        if (mounted) setItems(data.data ?? []);
      } catch {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // ESC cierra
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const visibles = items.filter((n) => !dismissed.has(n.id));
  const total = visibles.length;

  const dismiss = (id: string) => {
    const next = new Set(dismissed); next.add(id);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch {}
  };
  const clearAll = () => {
    const next = new Set([...dismissed, ...items.map((n) => n.id)]);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch {}
  };

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex">
          <button
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/55 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="w-full max-w-md bg-white h-full flex flex-col shadow-glass"
          >
            <header className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h3 className="ce-display font-bold text-xl">Centro de actividad</h3>
              <div className="flex items-center gap-2">
                {total > 0 && (
                  <button onClick={clearAll} className="text-xs text-muted hover:text-ink underline">
                    Ocultar todas
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Cerrar" className="w-9 h-9 rounded-xl hover:bg-line/50">✕</button>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              {visibles.length === 0 ? (
                <p className="p-10 text-center text-muted text-sm">Todo en orden. Sin actividad por revisar.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {visibles.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        'p-4 hover:bg-line/20 cursor-pointer',
                        n.severity === 'danger'  && 'bg-red-50/30',
                        n.severity === 'warning' && 'bg-amber-50/30',
                        n.severity === 'success' && 'bg-emerald-50/30',
                      )}
                      onClick={() => { setOpen(false); router.push(n.url); }}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn(
                          'mt-0.5 shrink-0',
                          n.severity === 'danger'  ? 'text-red-600'
                          : n.severity === 'warning' ? 'text-amber-600'
                          : n.severity === 'success' ? 'text-emerald-600'
                          : 'text-ink/70',
                        )}>
                          <Icon name={iconFor(n.tipo)} size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{n.titulo}</p>
                          <p className="text-xs text-muted mt-0.5">{n.mensaje}</p>
                          <p className="text-[10px] text-muted mt-1">
                            {new Date(n.created_at).toLocaleString('es-MX')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                          className="shrink-0 text-muted hover:text-ink"
                          aria-label="Ocultar"
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-xl hover:bg-line/50 grid place-items-center"
        aria-label="Centro de actividad"
      >
        <Icon name="bell" size={18} className="text-ink/80" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold grid place-items-center">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {typeof window !== 'undefined' ? createPortal(drawer, document.body) : null}
    </>
  );
}

function iconFor(tipo: string): IconName {
  switch (tipo) {
    case 'ticket':       return 'message-circle';
    case 'nuevo_local':  return 'store';
    case 'pago_fallido': return 'alert-triangle';
    default:             return 'bell';
  }
}
