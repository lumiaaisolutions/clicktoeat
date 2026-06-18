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

  // El local "tiene Stripe" cuando ya pasó por checkout y existe customer.
  // Para locales en trial manual seteados por super_admin, no hay Stripe
  // customer → el portal NO funciona y hay que mandarlos a Checkout para
  // que metan tarjeta. Esto evita el 404 silencioso de antes.
  const tieneStripe = !!plan?.has_stripe_customer;

  async function openPortal() {
    setOpening(true); setError(null);
    // Sin customer → no hay portal. Mandamos directo a checkout del plan
    // actual para que el dueño pueda meter tarjeta y activar la suscripción.
    if (!tieneStripe) {
      window.location.href = '/onboarding/elegir-plan';
      return;
    }
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
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <Icon name="card" size={14} className="text-[color:var(--ce-accent)]" />
            Tu suscripción
          </p>
          <h1 className="ce-display mt-2 text-3xl md:text-4xl font-bold tracking-tight">
            Plan y facturación
          </h1>
        </div>
        <a
          href={(process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicktoeat.lumiaaisolutions.com') + '/'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl border border-line bg-white text-sm font-semibold text-ink hover:border-ink/30 transition shrink-0"
        >
          <Icon name="home" size={14} />
          Volver al landing principal
        </a>
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
                  ${plan.precio_mxn ?? '—'} MXN/mes ·{' '}
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
                ) : tieneStripe ? (
                  <>
                    Cambiar plan / método de pago
                    <Icon name="arrow-up-right" size={14} />
                  </>
                ) : (
                  <>
                    Agregar tarjeta y activar
                    <Icon name="arrow-up-right" size={14} />
                  </>
                )}
              </button>
            </div>

            {isTrialing && (
              <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                <strong>Estás en trial.</strong>{' '}
                {daysLeft !== null
                  ? <>Tu trial termina en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>. </>
                  : <>Agrega tu tarjeta para mantener el acceso al terminar el periodo de prueba. </>
                }
                Agrega tu tarjeta antes para mantener tu local activo. <strong>No te cobramos nada hoy.</strong>
              </div>
            )}

            {/* Aviso "Este local no tiene suscripción activa" SOLO cuando NO
                está en trial. Antes salía siempre que faltara stripe_customer
                aún con un trial válido marcado por super_admin → ruido visual. */}
            {!tieneStripe && !isTrialing && plan.status !== 'canceled' && (
              <div className="mt-6 rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
                Aún no has configurado tu método de pago. Toca <strong>"Agregar tarjeta y activar"</strong> arriba para empezar.
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

          {/* F88 — sección de upgrade visible (auto-scroll si viene ?upgrade=...) */}
          <UpgradeSection currentPlanSlug={plan?.slug ?? ''} />

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

/* ─────────── Sección "Cambiar de plan" inline ─────────── */
interface AvailablePlan {
  slug: string;
  nombre: string;
  precio_mxn: number;
  features: string[];
  available_for_purchase: boolean;
}

function UpgradeSection({ currentPlanSlug }: { currentPlanSlug: string }) {
  const [plans, setPlans] = useState<AvailablePlan[] | null>(null);
  const [busy,  setBusy]  = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: AvailablePlan[] }>('/billing/plans')
      .then(({ data }) => setPlans(data.data))
      .catch(() => setPlans([]));
  }, []);

  // Auto-scroll si la URL trae ?upgrade=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade')) {
      setTimeout(() => {
        document.getElementById('upgrade-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [plans]);

  if (!plans || plans.length === 0) return null;

  const cambiar = async (slug: string) => {
    setBusy(slug);
    try {
      const { data } = await api.post<{ session_url?: string; url?: string }>('/billing/checkout', { plan_slug: slug });
      const url = data?.session_url ?? data?.url;
      if (!url) {
        alert('No recibimos URL de pago. Intenta de nuevo en un momento.');
        setBusy(null);
        return;
      }
      window.location.href = url;
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No pudimos abrir el cambio de plan.');
      setBusy(null);
    }
  };

  return (
    <div id="upgrade-section" className="rounded-3xl border border-line bg-white p-5 sm:p-6 scroll-mt-6">
      <div className="flex items-start justify-between gap-2 flex-wrap mb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted font-semibold">Cambiar de plan</p>
          <h2 className="ce-display font-bold text-lg mt-1">Mejora cuando lo necesites</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {plans.map((p) => {
          const isCurrent = p.slug === currentPlanSlug;
          return (
            <div
              key={p.slug}
              className={cn(
                'rounded-2xl border p-4',
                isCurrent ? 'border-emerald-300 bg-emerald-50/30' : 'border-line',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="ce-display font-bold text-base">{p.nombre}</p>
                {isCurrent && <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Actual</span>}
              </div>
              <p className="ce-display text-2xl font-bold tabular-nums mt-1">
                ${p.precio_mxn.toLocaleString('es-MX')} <span className="text-xs text-muted font-normal">/mes</span>
              </p>
              {isCurrent ? (
                <p className="mt-3 text-xs text-muted">Tu plan actual.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => cambiar(p.slug)}
                  disabled={!p.available_for_purchase || busy !== null}
                  className={cn(
                    'mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition',
                    p.available_for_purchase
                      ? 'bg-ink text-white hover:opacity-90 disabled:opacity-40'
                      : 'bg-line/40 text-muted cursor-not-allowed',
                  )}
                  title={!p.available_for_purchase ? 'Configuración de Stripe pendiente' : ''}
                >
                  {busy === p.slug ? 'Abriendo…' : 'Cambiar a este plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-3">
        Cambios entre planes se aplican al instante. La diferencia se prorrateará en tu próxima factura.
      </p>
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
        href="/onboarding/elegir-plan"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90"
      >
        Ver planes
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}

const HUMAN: Record<string, string> = {
  branding_basico:    'Pon tu logo y color',
  branding_avanzado:  'Personaliza colores, tipografías y banner',
  inventario:         'Control de ingredientes y stock',
  recetas:            'Descuento automático de ingredientes',
  compras:            'Registro de compras a proveedor',
  metricas_basicas:   'Métricas del día',
  metricas_avanzadas: 'Reportes avanzados',
  pos:                'Caja para cobrar en mostrador',
  qr_personalizado:   'Código QR con tu logo',
  notificaciones:     'Avisos en vivo cuando llega un pedido',
  staff_multi:        'Cuentas para tu equipo',
  audit_log:          'Historial de cambios',
  restore:            'Recuperar elementos borrados',
  multi_sucursal:     'Varias sucursales en una sola cuenta',
  white_label:        'Tu marca sin el logo de ClickToEat',
  api_webhooks:       'Conexión a tu sistema de cocina o ERP',
  soporte_premium:    'Soporte prioritario por WhatsApp',
};

function humanFeature(key: string): string {
  return HUMAN[key] ?? key;
}
