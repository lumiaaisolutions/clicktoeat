'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStore } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Plan {
  slug:        string;
  nombre:      string;
  precio_mxn:  number;
  features:    string[];
  max_productos: number | null;
  max_staff:     number | null;
}

const FEATURE_LABELS: Record<string, string> = {
  branding_basico:    'Pon tu logo y color',
  branding_avanzado:  'Personaliza colores, tipografías y banner',
  inventario:         'Control de ingredientes y stock',
  recetas:            'Descuento automático de ingredientes',
  compras:            'Registro de compras a proveedor',
  metricas_basicas:   'Métricas del día',
  metricas_avanzadas: 'Reportes avanzados (margen, top productos, horarios pico)',
  pos:                'Caja para cobrar en mostrador',
  qr_personalizado:   'Código QR con tu logo',
  notificaciones:     'Avisos en vivo cuando llega un pedido',
  staff_multi:        'Cuentas para tu equipo',
  audit_log:          'Historial de quién cambió qué',
  restore:            'Recuperar elementos borrados',
  multi_sucursal:     'Varias sucursales en una sola cuenta',
  white_label:        'Tu marca sin el logo de ClickToEat',
  api_webhooks:       'Conexión a tu sistema de cocina o ERP',
  soporte_premium:    'Soporte prioritario por WhatsApp',
};

export default function ElegirPlanPage() {
  const router = useRouter();
  const [plans,    setPlans]    = useState<Plan[] | null>(null);
  const [busy,     setBusy]     = useState<string | null>(null);

  useEffect(() => {
    // Si no hay token, no llegó por signup → mandar a /registro
    if (!tokenStore.get()) { router.replace('/registro'); return; }
    api.get<{ data: Plan[] }>('/billing/plans')
      .then(({ data }) => setPlans(data.data))
      .catch(() => setPlans([]));
  }, [router]);

  const elegir = async (plan: Plan) => {
    setBusy(plan.slug);
    try {
      const { data } = await api.post<{ url: string }>('/billing/checkout', {
        plan_slug: plan.slug,
      });
      window.location.href = data.url;
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'No pudimos abrir el checkout.');
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#FBF8F3]">
      <header className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo variant="lockup" size={28} />
          <span className="text-xs uppercase tracking-wider text-muted font-semibold">Paso 2 de 3 · Elige plan</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="ce-display text-3xl sm:text-4xl font-bold">Elige tu plan</h1>
          <p className="text-muted mt-2 max-w-xl mx-auto">
            14 días gratis en cualquier plan. Sin cargo hasta que termines el trial.
            Puedes cambiar de plan cuando quieras.
          </p>
        </div>

        {!plans ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 rounded-3xl bg-white border border-line animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p, idx) => {
              const isMid = idx === 1;
              const previousPlan = idx > 0 ? plans[idx - 1] : null;
              const prevSet = new Set(previousPlan?.features ?? []);
              const extras = previousPlan ? p.features.filter((f) => !prevSet.has(f)) : p.features;
              return (
                <div
                  key={p.slug}
                  className={cn(
                    'rounded-3xl border bg-white p-6 flex flex-col',
                    isMid ? 'border-ink/40 shadow-glass relative' : 'border-line',
                  )}
                >
                  {isMid && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-ink text-white text-[10px] uppercase tracking-wider font-bold">
                      Más popular
                    </span>
                  )}
                  <p className="ce-display text-xl font-bold">{p.nombre}</p>
                  <p className="ce-display text-3xl font-bold mt-2 tabular-nums">
                    ${p.precio_mxn.toLocaleString('es-MX')}
                    <span className="text-sm text-muted font-normal"> /mes</span>
                  </p>
                  <p className="text-xs text-muted mt-1">+ IVA · MXN</p>

                  <ul className="mt-5 space-y-2 flex-1">
                    {previousPlan && (
                      <li className="text-sm font-semibold flex items-center gap-2">
                        <Icon name="check" size={14} className="text-emerald-600 shrink-0" />
                        Todo lo del plan {previousPlan.nombre}, más:
                      </li>
                    )}
                    {extras.map((f) => (
                      <li key={f} className="text-sm flex items-center gap-2">
                        <Icon name="check" size={14} className="text-emerald-600 shrink-0" />
                        {FEATURE_LABELS[f] ?? f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => elegir(p)}
                    disabled={busy !== null}
                    className={cn(
                      'mt-6 w-full py-3 rounded-2xl font-semibold transition disabled:opacity-40',
                      isMid ? 'bg-ink text-white hover:opacity-90' : 'border border-line hover:border-ink/40',
                    )}
                  >
                    {busy === p.slug ? 'Abriendo Stripe…' : 'Empezar gratis 14 días'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted mt-10">
          ¿Dudas? <a href="mailto:soporte@lumiaaisolutions.com" className="underline">Escríbenos</a>.
          <br/>
          Tus datos viajan cifrados. El cobro lo hace Stripe — nunca vemos tu tarjeta.
        </p>
      </section>
    </main>
  );
}
