'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { subscribeConfirm, resolveConfirm, type ConfirmRequest } from '@/store/confirm';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

// Diálogo de confirmación global con diseño (sustituye a window.confirm).
// Montar una vez (en el layout del panel). Escucha el store `confirm`.
export function ConfirmDialog() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => subscribeConfirm(setReq), []);

  useEffect(() => {
    if (!req) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolveConfirm(false);
      if (e.key === 'Enter') resolveConfirm(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req]);

  if (!mounted) return null;
  const danger = req?.tone === 'danger';

  return createPortal(
    <AnimatePresence>
      {req && (
        <motion.div
          className="fixed inset-0 grid place-items-center p-4"
          style={{ zIndex: 999998 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.16 }}
        >
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => resolveConfirm(false)} />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_30px_80px_-20px_rgba(20,12,6,0.5)]"
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl ${danger ? 'bg-red-100 text-red-600' : 'bg-[color:var(--ce-accent,#F26A1F)]/12 text-[color:var(--ce-accent,#F26A1F)]'}`}
              >
                {danger ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>
                )}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 id="confirm-title" className="text-base font-semibold text-ink leading-snug">{req.title}</h2>
                {req.message && <p className="mt-1 text-sm text-muted leading-snug whitespace-pre-line">{req.message}</p>}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                {req.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => resolveConfirm(true)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${danger ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-400' : 'bg-ink hover:bg-ink/90 focus-visible:ring-[color:var(--ce-accent,#F26A1F)]'}`}
              >
                {req.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
