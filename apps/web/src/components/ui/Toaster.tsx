'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { subscribe, dismiss, type ToastItem, type ToastKind } from '@/store/toast';

// Toaster propio (reemplaza a sileo). Diseño tipo "notification card":
// badge de ícono por estado + título + descripción + cerrar, con glow de color.
// Se monta en un portal a <body> con z-index altísimo → SIEMPRE por encima de
// modales y paneles de edición (el bug que reportaba el usuario). Auto-cierre
// con pausa al hover, barra de progreso y swipe-para-descartar. Respeta
// prefers-reduced-motion.

interface KindStyle {
  badge: string;      // fondo del badge
  bar: string;        // color de la barra de progreso / acento
  glow: string;       // tinte del shadow inferior
  icon: ReactNode;    // glifo blanco
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const KIND: Record<ToastKind, KindStyle> = {
  success: {
    badge: '#33B87A', bar: '#33B87A', glow: 'rgba(51,184,122,0.28)',
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M18 6 7 17l-4-4" /><path d="m22 10-7.5 7.5L13 16" /></svg>),
  },
  error: {
    badge: '#F26B6B', bar: '#F26B6B', glow: 'rgba(242,107,107,0.28)',
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="m4.9 4.9 14.2 14.2" /></svg>),
  },
  warning: {
    badge: '#F59E0B', bar: '#F59E0B', glow: 'rgba(245,158,11,0.28)',
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>),
  },
  info: {
    badge: '#5B8DEF', bar: '#5B8DEF', glow: 'rgba(91,141,239,0.28)',
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>),
  },
  neutral: {
    badge: '#94A3B8', bar: '#94A3B8', glow: 'rgba(148,163,184,0.26)',
    icon: (<svg width="18" height="18" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>),
  },
};

function ToastCard({ item, reduce }: { item: ToastItem; reduce: boolean }) {
  const st = KIND[item.kind];
  const [paused, setPaused] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const remaining = useRef<number>(item.duration);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (item.duration <= 0) return;
    const run = () => {
      startedAt.current = Date.now();
      timer.current = setTimeout(() => dismiss(item.id), remaining.current);
    };
    if (paused) {
      if (timer.current) clearTimeout(timer.current);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    } else {
      run();
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [paused, item.id, item.duration]);

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }}
      drag={reduce ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.x > 90 || info.velocity.x > 600) dismiss(item.id); }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="status"
      aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
      className="pointer-events-auto relative overflow-hidden rounded-2xl border border-line bg-white/95 backdrop-blur-sm px-3.5 py-3 flex items-start gap-3 cursor-grab active:cursor-grabbing select-none"
      style={{ boxShadow: `0 12px 30px -12px rgba(20,12,6,0.30), 0 10px 26px -16px ${st.glow}` }}
    >
      <span
        className="shrink-0 grid place-items-center w-9 h-9 rounded-xl text-white shadow-sm"
        style={{ background: st.badge, boxShadow: `0 6px 16px -6px ${st.glow}` }}
      >
        {st.icon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-ink leading-snug break-words">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-[13px] text-muted leading-snug break-words">{item.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Cerrar aviso"
        className="shrink-0 -mr-1 -mt-0.5 grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-ink/5 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" {...S}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
      </button>

      {item.duration > 0 && !reduce && (
        <motion.span
          className="absolute left-0 bottom-0 h-[3px] rounded-full"
          style={{ background: st.bar, opacity: 0.55 }}
          initial={{ width: '100%' }}
          animate={{ width: paused ? undefined : '0%' }}
          transition={{ duration: paused ? 0 : item.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.li>
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => subscribe(setItems), []);

  if (!mounted) return null;

  return createPortal(
    <ul
      aria-label="Avisos"
      style={{ zIndex: 1000000 }}
      className="fixed top-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 flex flex-col gap-2.5 sm:w-[380px] pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {items.map((it) => (
          <ToastCard key={it.id} item={it} reduce={reduce} />
        ))}
      </AnimatePresence>
    </ul>,
    document.body,
  );
}
