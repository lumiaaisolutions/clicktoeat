'use client';

import Link from 'next/link';
import { usePlan } from '@/store/plan';
import { Icon } from '@/components/ui/Icon';

/**
 * Banner superior del admin para informar el estado del plan:
 *  - trialing → countdown a `trial_ends_at` con CTA "Agregar tarjeta".
 *  - past_due → banner rojo "tu cobro falló — actualiza tu método de pago".
 *  - canceled → mensaje suave "cancelaste, pierdes acceso el X".
 *
 * Solo se renderiza cuando hay un mensaje útil que mostrar — null en
 * `active` o `incomplete` (no hay plan).
 */
export function TrialBanner() {
  const plan      = usePlan((s) => s.plan);
  const isTrialing = usePlan((s) => s.isTrialing());
  const isPastDue  = usePlan((s) => s.isPastDue());
  const daysLeft   = usePlan((s) => s.daysUntilTrialEnd());

  if (!plan) return null;

  if (isTrialing) {
    // Si trial_ends_at viene null (caso de trial seteado a mano sin fecha),
    // mostramos un mensaje genérico sin "X días" para no decir "null días".
    const tieneFecha = daysLeft !== null;
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="clock" size={14} className="text-amber-700" />
          {tieneFecha ? (
            <>
              Tu trial de <strong>{plan.nombre}</strong> termina en{' '}
              <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>.
            </>
          ) : (
            <>
              Estás en <strong>trial de {plan.nombre}</strong>. Agrega tu tarjeta para mantener el acceso.
            </>
          )}
        </span>
        <Link href="/admin/billing" className="ml-2 underline font-medium text-amber-900 hover:text-amber-950">
          Agregar tarjeta
        </Link>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-center text-sm text-red-900">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="alert-triangle" size={14} className="text-red-700" />
          Tu último cobro falló. Tienes acceso por 3 días más.
        </span>
        <Link href="/admin/billing" className="ml-2 underline font-medium hover:text-red-950">
          Actualizar método de pago
        </Link>
      </div>
    );
  }

  if (plan.status === 'canceled' && plan.current_period_ends_at) {
    const ends = new Date(plan.current_period_ends_at).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-center text-sm text-slate-700">
        Cancelaste tu suscripción. Sigues con acceso completo hasta el <strong>{ends}</strong>.
        <Link href="/admin/billing" className="ml-2 underline font-medium">
          Reactivar
        </Link>
      </div>
    );
  }

  return null;
}
