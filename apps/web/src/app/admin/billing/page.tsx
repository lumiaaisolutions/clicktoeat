'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { usePlan, type PlanStatus } from '@/store/plan';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';
import { cn, formatMXN } from '@/lib/utils';

const STATUS_LABEL: Record<PlanStatus, string> = {
  trialing:   'En trial',
  active:     'Activo',
  past_due:   'Pago pendiente',
  canceled:   'Cancelado',
  incomplete: 'Incompleto',
};

const STATUS_CLR: Record<PlanStatus, string> = {
  trialing:   'bg-amber-100 text-amber-800',
  active:     'bg-emerald-100 text-emerald-800',
  past_due:   'bg-red-100 text-red-800',
  canceled:   'bg-slate-100 text-slate-700',
  incomplete: 'bg-slate-100 text-slate-700',
};

export default function BillingPage() {
  const user        = useAuth((s) => s.user);
  const plan        = usePlan((s) => s.plan);
  const isTrialing  = usePlan((s) => s.isTrialing());
  const daysLeft    = usePlan((s) => s.daysUntilTrialEnd());
  const [opening, setOpening] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Solo owner ve esta página
  if (user && user.rol !== 'owner' && user.rol !== 'super_admin') {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
        Solo el dueño del local puede gestionar la suscripción.
      </div>
    );
  }

  async function openPortal() {
    setOpening(true); setError(null);
    try {
      const { data } = await api.get<{ url: string }>('/billing/portal');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'No pudimos abrir el portal.');
      setOpening(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
          <Icon name="card" size={14} className="text-[color:var(--ce-accent)]" />
          Tu suscripción
        </p>
        <h1 className="ce-display mt-2 text-3xl md:text-4xl font-bold tracking-tight">
          Plan y facturación
        </h1>
      </header>

      {!plan ? (
        <EmptyPlanCard />
      ) : (
        <>
          {/* Plan card principal */}
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="ce-display text-2xl sm:text-3xl font-bold">{plan.nombre}</h2>
                  <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider', STATUS_CLR[plan.status])}>
                    {STATUS_LABEL[plan.status]}
                  </span>
                </div>
                <p className="text-sm text-muted mt-1">
                  ${plan.slug === 'essential' ? '99' : '299'} MXN/mes ·{' '}
                  {plan.features.length} módulos incluidos
                </p>
              </div>

              <button
                onClick={openPortal}
                disabled={opening}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 transition tap-target disabled:opacity-60"
              >
                {opening ? (
                  <>
                    <Icon name="compass" size={16} className="animate-spin" />
                    Abriendo…
                  </>
                ) : (
                  <>
                    Cambiar plan / método de pago
                    <Icon name="arrow-up-right" size={14} />
                  </>
                )}
              </button>
            </div>

            {isTrialing && (
              <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                <strong>Estás en trial.</strong> Tu trial termina en{' '}
                <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>. Agrega tu tarjeta antes
                de esa fecha para mantener tu local activo. <strong>No te cobramos nada hoy.</strong>
              </div>
            )}

            {plan.status === 'past_due' && (
              <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
                <strong>Tu último cobro falló.</strong> Tienes 3 días de gracia. Actualiza tu método
                de pago en el portal para evitar que se suspenda tu servicio.
              </div>
            )}

            {plan.status === 'canceled' && plan.current_period_ends_at && (
              <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                Cancelaste. Sigues con acceso completo hasta el{' '}
                <strong>{new Date(plan.current_period_ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Límites + features */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-line bg-white p-6">
              <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Límites de tu plan</p>
              <dl className="space-y-2 text-sm">
                <Limit label="Productos" value={plan.limits.productos} />
                <Limit label="Categorías" value={plan.limits.categorias} />
                <Limit label="Cuentas de staff" value={plan.limits.staff} />
              </dl>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6">
              <p className="text-xs text-muted font-medium uppercase tracking-wider mb-3">Módulos incluidos</p>
              <ul className="grid grid-cols-1 gap-1.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="inline-flex items-center gap-2">
                    <Icon name="check-circle" size={14} className="text-emerald-600 shrink-0" />
                    {humanFeature(f)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer info + cancelar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-muted">
              Cancela cuando quieras desde el portal — sin penalización.
            </p>
            <CancelFeedbackTrigger />
          </div>
        </>
      )}
    </div>
  );
}

function CancelFeedbackTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted hover:text-ink underline-offset-2 hover:underline"
      >
        ¿Estás pensando en cancelar?
      </button>
      {open && <CancelFeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}

const MOTIVOS = [
  { value: 'precio',           label: 'Es muy caro para mí' },
  { value: 'falta_feature',    label: 'Falta una función que necesito' },
  { value: 'no_funciono',      label: 'Hubo problemas técnicos / no me funcionó' },
  { value: 'no_lo_uso',        label: 'No alcancé a usarlo' },
  { value: 'cambio_proveedor', label: 'Voy a usar otra plataforma' },
  { value: 'otro',             label: 'Otra razón' },
] as const;

function CancelFeedbackModal({ onClose }: { onClose: () => void }) {
  const [motivo,   setMotivo]   = useState<string>('');
  const [detalle,  setDetalle]  = useState('');
  const [busy,     setBusy]     = useState(false);
  const [step,     setStep]     = useState<'form' | 'thanks'>('form');

  const enviar = async (irPortal: boolean) => {
    if (!motivo) return;
    setBusy(true);
    try {
      await api.post('/billing/cancel-feedback', { motivo, motivo_detalle: detalle || null });
      setStep('thanks');
      if (irPortal) {
        const { data } = await api.get<{ url: string }>('/billing/portal');
        window.location.href = data.url;
      }
    } catch { /* no bloquear */ } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl border border-line max-w-md w-full p-6 shadow-glass">
        {step === 'form' ? (
          <>
            <h3 className="ce-display text-xl font-bold mb-1">¿Qué pasó?</h3>
            <p className="text-sm text-muted mb-4">
              Tu respuesta nos ayuda a mejorar. No es un compromiso de cancelación — sigues con tu plan.
            </p>
            <div className="space-y-1.5 mb-4">
              {MOTIVOS.map((m) => (
                <label key={m.value} className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition',
                  motivo === m.value ? 'border-ink/60 bg-ink/5 shadow-soft' : 'border-line hover:border-ink/30',
                )}>
                  <input
                    type="radio"
                    name="motivo"
                    value={m.value}
                    checked={motivo === m.value}
                    onChange={() => setMotivo(m.value)}
                    className="accent-ink"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Cuéntanos más (opcional)"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl border border-line text-sm resize-none"
            />
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-line text-sm font-medium hover:bg-line/40 flex-1"
              >
                Mejor me quedo
              </button>
              <button
                type="button"
                onClick={() => enviar(true)}
                disabled={!motivo || busy}
                className="px-4 py-2 rounded-xl bg-ink text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex-1"
              >
                Cancelar plan
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 grid place-items-center mx-auto mb-3">
              <Icon name="check" size={20} className="text-emerald-700" />
            </div>
            <h3 className="ce-display font-bold text-lg">Gracias por tu feedback</h3>
            <p className="text-sm text-muted mt-1">Vamos a usarlo para mejorar el producto.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-line last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value === null ? 'Ilimitado' : value}</span>
    </div>
  );
}

function EmptyPlanCard() {
  return (
    <div className="rounded-3xl border border-line bg-white p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 grid place-items-center mx-auto">
        <Icon name="sparkles" size={20} className="text-amber-700" />
      </div>
      <h3 className="ce-display text-2xl font-bold mt-4">Sin suscripción activa</h3>
      <p className="text-sm text-muted mt-2 max-w-md mx-auto">
        Aún no tienes un plan asignado. Para empezar a vender por WhatsApp, elige tu plan
        con 14 días de prueba sin tarjeta.
      </p>
      <Link
        href="/#pricing"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90"
      >
        Ver planes
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}

const HUMAN: Record<string, string> = {
  branding_basico:    'Branding básico',
  branding_avanzado:  'Branding avanzado',
  inventario:         'Inventario',
  recetas:            'Recetas',
  compras:            'Compras a proveedor',
  metricas_basicas:   'Métricas',
  metricas_avanzadas: 'Métricas avanzadas',
  pos:                'POS interno',
  qr_personalizado:   'QR personalizado',
  notificaciones:     'Notificaciones in-app',
  staff_multi:        'Múltiples cuentas de staff',
  audit_log:          'Audit log',
  restore:            'Restaurar elementos borrados',
};

function humanFeature(key: string): string {
  return HUMAN[key] ?? key;
}
