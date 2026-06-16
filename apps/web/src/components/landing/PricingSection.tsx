'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { soporteWhatsappUrl } from '@/lib/support';
import { cn } from '@/lib/utils';

interface ApiPlan {
  slug: 'essential' | 'professional';
  nombre: string;
  precio_mxn: number;
  features: string[];
  limits: { productos: number | null; categorias: number | null; staff: number | null };
  available_for_purchase: boolean;
}

interface PlansResponse { data: ApiPlan[]; trial_days: number }

const FEATURE_LABELS: Record<string, string> = {
  branding_basico:    'Branding básico (logo + 1 color)',
  branding_avanzado:  'Branding avanzado (banner + colores + tipografía)',
  inventario:         'Inventario con ingredientes',
  recetas:            'Recetas (descuento automático)',
  compras:            'Compras a proveedor',
  metricas_basicas:   'Métricas del día',
  metricas_avanzadas: 'Métricas avanzadas + margen',
  pos:                'POS interno',
  qr_personalizado:   'QR con tu logo',
  notificaciones:     'Notificaciones in-app',
  staff_multi:        'Múltiples cuentas de staff',
  audit_log:          'Audit log',
  restore:            'Restaurar elementos borrados',
};

const PLAN_HIGHLIGHT: Record<string, string> = {
  essential:    'Para arrancar a vender por WhatsApp.',
  professional: 'Para operar y escalar tu local.',
};

export function PricingSection() {
  const [plans,   setPlans]   = useState<ApiPlan[] | null>(null);
  const [trial,   setTrial]   = useState(14);
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.get<PlansResponse>('/billing/plans')
      .then(({ data }) => { setPlans(data.data); setTrial(data.trial_days); })
      .catch(() => setPlans([]));
  }, []);

  async function startCheckout(slug: string) {
    setLoading(slug); setError(null);
    try {
      const { data } = await api.post<{ session_url: string; session_id: string }>('/billing/checkout', { plan_slug: slug });
      window.location.href = data.session_url;
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'No pudimos iniciar el checkout. Intenta de nuevo.');
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="relative bg-[color:var(--ce-bg)] border-y border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-center max-w-2xl mx-auto"
        >
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2 justify-center">
            <span className="w-6 h-px bg-ink/40" />
            Planes
          </p>
          <h2 className="ce-display mt-4 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1] tracking-tight">
            Empieza gratis.<br />
            <span className="text-ink/40">Decide</span> después.
          </h2>
          <p className="mt-5 text-base text-muted max-w-md mx-auto">
            {trial} días de prueba sin tarjeta. Cancela cuando quieras.
          </p>
        </motion.div>

        {plans === null ? (
          <div className="mt-12 text-center text-muted text-sm">Cargando planes…</div>
        ) : plans.length === 0 ? (
          <div className="mt-12 text-center text-muted text-sm">No hay planes disponibles ahora.</div>
        ) : (
          <div className="mt-14 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((p) => (
              <PlanCard
                key={p.slug}
                plan={p}
                trialDays={trial}
                isPopular={p.slug === 'professional'}
                loading={loading === p.slug}
                onStart={() => startCheckout(p.slug)}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 max-w-md mx-auto rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted">
          Sin tarjeta requerida · Cancela cuando quieras ·{' '}
          <a
            href={soporteWhatsappUrl({ motivo: 'Tengo dudas sobre los planes antes de empezar mi trial.', desde: 'landing pricing' })}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            Soporte por WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  plan, trialDays, isPopular, loading, onStart,
}: {
  plan: ApiPlan;
  trialDays: number;
  isPopular: boolean;
  loading: boolean;
  onStart: () => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: isPopular ? 0.1 : 0, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        'relative rounded-3xl border bg-white p-7 sm:p-8 flex flex-col',
        isPopular
          ? 'border-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] md:scale-[1.03]'
          : 'border-line shadow-soft',
      )}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-ink text-white text-[10px] font-bold uppercase tracking-wider">
          Más popular
        </span>
      )}

      <h3 className="ce-display text-2xl font-bold">{plan.nombre}</h3>
      <p className="text-xs text-muted mt-1.5 leading-relaxed">{PLAN_HIGHLIGHT[plan.slug]}</p>

      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="ce-display text-5xl font-bold tabular-nums">${plan.precio_mxn.toFixed(0)}</span>
        <span className="text-sm text-muted">MXN/mes</span>
      </div>

      <ul className="mt-7 space-y-2.5 text-sm flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Icon name="check-circle" size={15} className="text-emerald-600 mt-0.5 shrink-0" />
            <span>{FEATURE_LABELS[f] ?? f}</span>
          </li>
        ))}
        {plan.limits.productos !== null && (
          <li className="flex items-start gap-2.5 text-muted">
            <Icon name="x" size={14} className="mt-0.5 shrink-0 text-muted/60" />
            <span>Máx. {plan.limits.productos} productos</span>
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={onStart}
        disabled={loading || !plan.available_for_purchase}
        className={cn(
          'mt-8 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-medium text-sm transition tap-target',
          isPopular
            ? 'bg-ink text-white hover:opacity-90'
            : 'bg-white border border-line text-ink hover:border-ink/40',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
        title={!plan.available_for_purchase ? 'Plan aún sin configurar en Stripe' : undefined}
      >
        {loading ? (
          <>
            <Icon name="compass" size={15} className="animate-spin" />
            Abriendo Stripe…
          </>
        ) : !plan.available_for_purchase ? (
          'Próximamente'
        ) : (
          <>
            Empezar {trialDays} días gratis
            <Icon name="arrow-right" size={15} />
          </>
        )}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">Sin tarjeta · cancela cuando quieras</p>
    </motion.article>
  );
}
