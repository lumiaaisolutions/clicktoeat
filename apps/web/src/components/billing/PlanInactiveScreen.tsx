'use client';

import Link from 'next/link';
import { usePlan } from '@/store/plan';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';
import { soporteWhatsappUrl } from '@/lib/support';

const LABEL: Record<string, string> = {
  incomplete: 'Suscripción incompleta',
  past_due:   'Pago pendiente',
  canceled:   'Suscripción cancelada',
};

const COPY: Record<string, string> = {
  incomplete: 'Tu suscripción aún no se completó. Termina el pago para activar tu local.',
  past_due:   'Tu último cobro falló y se acabó el periodo de gracia. Actualiza tu método de pago para seguir operando.',
  canceled:   'Tu suscripción ya no está activa. Reactívala para volver a recibir pedidos.',
};

/**
 * Pantalla bloqueante a nivel layout admin. Se muestra cuando el local del
 * owner/staff tiene un plan sin estado activo:
 *  - incomplete (nunca pagó tras checkout)
 *  - past_due con gracia vencida
 *  - canceled con periodo vencido
 *
 * El layout admin la renderiza ANTES de los children. Solo deja navegar
 * a `/admin/billing` y a `/logout`. Super_admin no se ve afectado.
 *
 * Si el local tiene plan_id NULL (legacy pre-SaaS), no aplica — pasa.
 */
export function PlanInactiveScreen() {
  const plan   = usePlan((s) => s.plan);
  const logout = useAuth((s) => s.logout);

  if (!plan) return null;
  const status = plan.status;
  const title  = LABEL[status] ?? 'Plan no activo';
  const body   = COPY[status] ?? COPY.incomplete;

  return (
    <div className="min-h-screen grid place-items-center bg-[color:var(--ce-bg)] px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] border border-line bg-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.25)] overflow-hidden">
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #FF2D2D 0%, #FF6B35 50%, #FFA62D 100%)' }}
        />
        <div className="p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 grid place-items-center mx-auto">
            <Icon name="alert-triangle" size={28} className="text-amber-700" />
          </div>

          <p className="mt-6 text-xs text-muted font-medium uppercase tracking-[0.2em] inline-flex items-center gap-2 justify-center">
            <span className="w-6 h-px bg-ink/30" />
            Acción requerida
          </p>
          <h1 className="ce-display mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-base text-muted max-w-md mx-auto">{body}</p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/billing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-ink text-white text-sm font-semibold hover:opacity-90 transition tap-target"
            >
              Ir a Suscripción
              <Icon name="arrow-right" size={16} />
            </Link>
            <button
              type="button"
              onClick={() => logout().then(() => { window.location.href = '/'; })}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-line bg-white text-sm font-medium hover:border-ink/40 tap-target"
            >
              Cerrar sesión
            </button>
          </div>

          <p className="mt-6 text-xs text-muted">
            ¿Dudas?{' '}
            <a
              href={soporteWhatsappUrl({
                motivo: `Mi suscripción está en estado "${status}" y no puedo entrar al panel. Necesito ayuda para reactivar.`,
                plan: plan.slug,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink font-semibold underline hover:text-[color:var(--ce-accent,#FF2D2D)]"
            >
              Escríbenos por WhatsApp
            </a>{' '}
            y te ayudamos a reactivar tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Util compartido: ¿este plan deja bloqueado al admin? */
export function isPlanBlocking(plan: ReturnType<typeof usePlan.getState>['plan']): boolean {
  if (!plan) return false;
  if (plan.is_active) return false;
  // Solo bloqueamos si efectivamente el local salió del SaaS.
  // (plan.status canceled con period futuro ya está marcado is_active=true por el backend).
  return ['incomplete', 'past_due', 'canceled'].includes(plan.status);
}
