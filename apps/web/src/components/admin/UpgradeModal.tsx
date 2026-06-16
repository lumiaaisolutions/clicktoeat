'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpgradeModal } from '@/store/upgradeModal';
import { Icon } from '@/components/ui/Icon';

const PLAN_INFO = {
  professional: {
    nombre:  'Profesional',
    precio:  '$299 MXN/mes',
    color:   'from-amber-100 to-amber-50',
    accent:  'text-amber-700',
  },
  premium: {
    nombre:  'Premium',
    precio:  '$599 MXN/mes',
    color:   'from-violet-100 to-violet-50',
    accent:  'text-violet-700',
  },
} as const;

/**
 * Modal global que se abre cuando un user intenta entrar a un módulo
 * bloqueado por su plan. Se monta una sola vez desde el admin layout.
 * Disparado vía `useUpgradeModal().show(...)`.
 */
export function UpgradeModal() {
  const open         = useUpgradeModal((s) => s.open);
  const requiredPlan = useUpgradeModal((s) => s.requiredPlan);
  const moduleLabel  = useUpgradeModal((s) => s.moduleLabel);
  const close        = useUpgradeModal((s) => s.close);
  const router       = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (typeof document === 'undefined') return null;

  const plan = requiredPlan ? PLAN_INFO[requiredPlan] : null;

  return createPortal(
    <AnimatePresence>
      {open && plan && (
        <motion.div
          key="upgrade-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <div className="absolute inset-0 grid place-items-center p-4">
            <motion.div
              key="upgrade-card"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white rounded-3xl border border-line shadow-glass overflow-hidden"
            >
              {/* Header */}
              <div className={`relative px-6 pt-6 pb-5 bg-gradient-to-br ${plan.color}`}>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Cerrar"
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg grid place-items-center hover:bg-white/50 text-ink/60 hover:text-ink transition"
                >
                  <Icon name="x" size={14} />
                </button>
                <div className={`w-12 h-12 rounded-2xl bg-white grid place-items-center shadow-sm ${plan.accent}`}>
                  <Icon name="lock" size={20} />
                </div>
                <p className="text-xs uppercase tracking-[0.18em] font-bold text-ink/60 mt-3">
                  Función bloqueada
                </p>
                <h3 className="ce-display text-2xl font-bold mt-1 leading-tight">
                  {moduleLabel ?? 'Esta función'} está en el plan {plan.nombre}
                </h3>
              </div>

              {/* Body */}
              <div className="p-6">
                <p className="text-sm text-ink/80 leading-relaxed">
                  Tu plan actual no incluye este módulo. Mejora a{' '}
                  <strong>{plan.nombre}</strong> ({plan.precio}) y desbloquéalo de inmediato — junto con todas las demás funciones del plan.
                </p>

                <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="flex-1 px-4 py-3 rounded-2xl border border-line text-sm font-semibold hover:bg-line/40 transition"
                  >
                    Ahora no
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      router.push('/admin/billing?upgrade=' + (requiredPlan ?? 'professional'));
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition inline-flex items-center justify-center gap-2"
                  >
                    Mejorar mi plan
                    <Icon name="arrow-right" size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
