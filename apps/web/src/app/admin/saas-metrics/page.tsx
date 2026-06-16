'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Metrics {
  mrr_mxn: number;
  arr_mxn: number;
  trialing_count: number;
  active_count: number;
  churn_30d_pct: number;
  conversion_30d_pct: number;
  distribucion: Array<{ plan_slug: string; plan_nombre: string; status: string; count: number }>;
  eventos_recientes: Array<{ id: number; local_id: number | null; type: string; processed_at: string | null; created_at: string }>;
  cohorts: Array<{
    cohort: string;
    cohort_label: string;
    size: number;
    retencion: Array<{ mes: number; pct: number; count: number }>;
  }>;
  generated_at: string;
}

export default function SaasMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);

  useEffect(() => {
    api.get<Metrics>('/admin/saas-metrics').then(({ data }) => setData(data)).catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Negocio"
        kickerIcon="chart"
        title="Cómo va el negocio,"
        titleAccent="al instante."
        description="Ingresos del mes, suscripciones activas y cómo se mueven tus locales. Sólo lo ves tú."
      />

      {!data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Ingreso mensual" value={`$${data.mrr_mxn.toLocaleString('es-MX')}`} sub="MXN cada mes" highlight />
            <Kpi label="Proyección anual" value={`$${data.arr_mxn.toLocaleString('es-MX')}`} sub="MXN al año" />
            <Kpi label="Locales pagando" value={String(data.active_count)} sub={`${data.trialing_count} en prueba gratis`} />
            <Kpi label="Bajas (30 días)" value={`${data.churn_30d_pct}%`} sub={`Conversión a pago: ${data.conversion_30d_pct}%`} />
          </div>

          <div className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">Cómo se reparten tus locales por plan</p>
            <table className="w-full text-sm">
              <thead className="text-muted text-xs uppercase tracking-wider">
                <tr><th className="text-left py-1.5">Plan</th><th className="text-left">Situación</th><th className="text-right">Locales</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.distribucion.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{d.plan_nombre}</td>
                    <td className="py-2 text-muted">{describePlanStatus(d.status)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cohort de retención mensual */}
          {data.cohorts && data.cohorts.length > 0 && (
            <div className="rounded-3xl border border-line bg-white p-5 overflow-x-auto">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Retención por mes de alta</p>
              <p className="text-[11px] text-muted mb-3">
                De cada grupo de locales que se sumó en un mes, qué % seguía pagando 1, 2, 3… meses después.
                Verde = mantiene a la gente; rojo = se van.
              </p>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-muted text-[10px] uppercase tracking-wider">
                    <th className="text-left py-1.5 pr-3">Mes de alta</th>
                    <th className="text-right py-1.5 pr-3">Altas</th>
                    {Array.from({ length: 6 }).map((_, m) => (
                      <th key={m} className="text-center py-1.5 px-1 w-[60px]">M{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.cohorts.map((c) => (
                    <tr key={c.cohort}>
                      <td className="py-2 pr-3 font-medium capitalize">{c.cohort_label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{c.size}</td>
                      {Array.from({ length: 6 }).map((_, m) => {
                        const ret = c.retencion.find((r) => r.mes === m);
                        if (!ret) return <td key={m} className="py-2 px-1 text-center text-muted text-xs">—</td>;
                        const pct = ret.pct;
                        const bg = pct >= 80 ? 'bg-emerald-100 text-emerald-800'
                          : pct >= 60 ? 'bg-emerald-50 text-emerald-700'
                          : pct >= 40 ? 'bg-amber-50 text-amber-700'
                          : pct >= 20 ? 'bg-orange-50 text-orange-700'
                          : 'bg-red-50 text-red-700';
                        return (
                          <td key={m} className="py-1 px-1 text-center">
                            <span className={cn('inline-block px-1.5 py-1 rounded-md text-[11px] font-semibold tabular-nums w-full', bg)}>
                              {pct}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-3xl border border-line bg-white p-5">
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">Actividad reciente de pagos</p>
            {data.eventos_recientes.length === 0 ? (
              <p className="text-sm text-muted">Sin movimientos todavía.</p>
            ) : (
              <ul className="space-y-1">
                {data.eventos_recientes.map((e) => {
                  const info = describeStripeEvent(e.type);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                      <span className={cn(
                        'w-8 h-8 rounded-xl grid place-items-center shrink-0 text-sm',
                        info.tone === 'success' ? 'bg-emerald-50 text-emerald-700'
                        : info.tone === 'warning' ? 'bg-amber-50 text-amber-700'
                        : info.tone === 'danger'  ? 'bg-red-50 text-red-700'
                        : 'bg-line/50 text-ink/60',
                      )}>
                        {info.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{info.label}</p>
                        {info.hint && <p className="text-[11px] text-muted truncate">{info.hint}</p>}
                      </div>
                      <span className="text-[11px] text-muted shrink-0">
                        {new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      {!e.processed_at && (
                        <span className="text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          pendiente
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-muted text-center">
            Calculado a {new Date(data.generated_at).toLocaleString('es-MX')}.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-3xl border border-line bg-white p-5',
      highlight && 'border-ink/30 shadow-soft',
    )}>
      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      <p className={cn('ce-display text-2xl md:text-3xl font-bold mt-1 tabular-nums', highlight && 'text-[color:var(--ce-accent,#FF2D2D)]')}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─────────── Friendly labels para eventos de Stripe ─────────── */
type EventTone = 'success' | 'warning' | 'danger' | 'neutral';

function describeStripeEvent(type: string): { label: string; icon: string; hint?: string; tone: EventTone } {
  const map: Record<string, { label: string; icon: string; hint?: string; tone: EventTone }> = {
    // Pagos exitosos
    'invoice.payment_succeeded':         { label: 'Pago recibido',                icon: '✓', tone: 'success', hint: 'Una factura mensual fue cobrada con éxito.' },
    'invoice.paid':                       { label: 'Factura pagada',               icon: '✓', tone: 'success' },
    'invoice.finalized':                  { label: 'Factura emitida',              icon: '$', tone: 'neutral', hint: 'Stripe generó el comprobante mensual.' },
    'invoice.created':                    { label: 'Nueva factura generada',       icon: '$', tone: 'neutral' },

    // Pagos con problema
    'invoice.payment_failed':             { label: 'Pago rechazado',                icon: '!', tone: 'danger',  hint: 'La tarjeta del cliente no autorizó el cobro.' },
    'invoice.payment_action_required':    { label: 'Pago requiere autenticación',   icon: '!', tone: 'warning', hint: 'El banco pidió un 3D Secure.' },

    // Suscripción
    'customer.subscription.created':      { label: 'Nueva suscripción',             icon: '★', tone: 'success', hint: 'Un local activó su plan.' },
    'customer.subscription.updated':      { label: 'Suscripción actualizada',       icon: '↻', tone: 'neutral' },
    'customer.subscription.deleted':      { label: 'Suscripción cancelada',          icon: '×', tone: 'danger',  hint: 'El local dio de baja su plan.' },
    'customer.subscription.trial_will_end': { label: 'Prueba por terminar',         icon: '⏱', tone: 'warning', hint: 'Quedan menos de 3 días de trial.' },

    // Cliente
    'customer.created':                   { label: 'Cliente nuevo en Stripe',       icon: '+', tone: 'neutral' },
    'customer.updated':                   { label: 'Datos del cliente actualizados', icon: '↻', tone: 'neutral' },
    'customer.deleted':                   { label: 'Cliente eliminado',              icon: '×', tone: 'danger'  },

    // Checkout
    'checkout.session.completed':         { label: 'Checkout completado',           icon: '✓', tone: 'success', hint: 'Un local completó el alta y entró al panel.' },
    'checkout.session.expired':           { label: 'Checkout expirado',             icon: '⏱', tone: 'warning' },

    // Portal
    'billing_portal.session.created':     { label: 'Acceso al portal de facturación', icon: '↗', tone: 'neutral', hint: 'El cliente abrió su panel de Stripe.' },
    'billing_portal.configuration.created': { label: 'Portal de facturación configurado', icon: '⚙', tone: 'neutral' },
  };

  return map[type] ?? { label: type.replace(/_/g, ' ').replace(/\./g, ' · '), icon: '•', tone: 'neutral' };
}

/* ─────────── Friendly labels para plan_status ─────────── */
function describePlanStatus(status: string): string {
  const map: Record<string, string> = {
    trialing:   'En prueba gratis',
    active:     'Pagando al corriente',
    past_due:   'Pago atrasado',
    canceled:   'Cancelado',
    incomplete: 'Alta sin terminar',
    paused:     'Pausado',
  };
  return map[status] ?? status;
}
