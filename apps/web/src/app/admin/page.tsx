'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Pedido, Producto, Ingrediente, Paginated, Resource } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/store/auth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn, formatMXN } from '@/lib/utils';

export default function AdminHome() {
  const user = useAuth((s) => s.user);
  if (user?.rol === 'super_admin') return <SuperAdminHome />;
  return <OwnerHome />;
}

/* ─────────────────────────────────────────────────────────────────
   Owner / staff dashboard — widgets reales
   ───────────────────────────────────────────────────────────────── */
function OwnerHome() {
  const user = useAuth((s) => s.user);
  const [local,        setLocal]        = useState<LocalAdmin | null>(null);
  const [pedidosHoy,   setPedidosHoy]   = useState<Pedido[] | null>(null);
  const [productosTop, setProductosTop] = useState<Producto[] | null>(null);
  const [bajoStock,    setBajoStock]    = useState<Ingrediente[]>([]);
  const [metricas,     setMetricas]     = useState<{ ventas: number; ticket: number; total: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: l }, pedResp, prodResp] = await Promise.all([
          api.get<Resource<LocalAdmin>>('/local'),
          api.get<Paginated<Pedido>>('/pedidos', { params: { per_page: 10 } }),
          api.get<Paginated<Producto>>('/productos', { params: { per_page: 5 } }),
        ]);
        if (!alive) return;
        setLocal(l.data);

        // Filtrar pedidos del día
        const hoy = new Date().toDateString();
        const delDia = (pedResp.data.data ?? []).filter((p) => p.created_at && new Date(p.created_at).toDateString() === hoy);
        setPedidosHoy(delDia);

        const total = delDia.reduce((s, p) => s + Number(p.total ?? 0), 0);
        setMetricas({ ventas: total, ticket: delDia.length ? total / delDia.length : 0, total: delDia.length });

        setProductosTop(prodResp.data.data.slice(0, 5));

        // Inventario en bajo stock — soft fail si plan no lo permite
        try {
          const ingResp = await api.get<{ data: Ingrediente[] }>('/ingredientes', { params: { bajo_stock: true } });
          if (alive) setBajoStock((ingResp.data.data ?? []).slice(0, 5));
        } catch { /* sin acceso a inventario */ }
      } catch { /* owner sin local */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker={`Hola, ${user?.nombre?.split(' ')[0] ?? ''}`}
        kickerIcon="home"
        title="Tu local hoy,"
        titleAccent="de un vistazo."
        description={local ? `${local.nombre} · ${local.public_url}` : 'Resumen de tu local en ClickToEat.'}
        actions={local && (
          <Link
            href={local.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-line text-sm font-medium hover:border-ink/40 transition"
          >
            <Icon name="arrow-up-right" size={14} />
            Ver mi landing
          </Link>
        )}
      />

      {/* KPIs del día */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricas === null ? (
          <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</>
        ) : (
          <>
            <Kpi icon="chart" label="Ventas hoy"      value={formatMXN(metricas.ventas)} highlight />
            <Kpi icon="bell"  label="Pedidos hoy"    value={String(metricas.total)} />
            <Kpi icon="cart"  label="Ticket promedio" value={formatMXN(metricas.ticket)} />
            <Kpi icon="package" label="En menú"      value={String(productosTop?.length ?? 0)} sub="productos" />
          </>
        )}
      </section>

      {/* Grid: pedidos recientes + alertas + atajos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pedidos del día — columna ancha */}
        <div className="lg:col-span-2 rounded-3xl border border-line bg-white p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <p className="ce-display font-bold text-lg">Pedidos de hoy</p>
              <p className="text-xs text-muted">Los más recientes primero.</p>
            </div>
            <Link href="/admin/pedidos" className="text-xs font-semibold text-ink/70 hover:text-ink inline-flex items-center gap-1">
              Ver todos <Icon name="arrow-right" size={12} />
            </Link>
          </header>
          {pedidosHoy === null ? (
            <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          ) : pedidosHoy.length === 0 ? (
            <EmptyHint icon="bell" title="Aún sin pedidos hoy" body="Cuando llegue uno por WhatsApp, aparecerá aquí." />
          ) : (
            <ul className="divide-y divide-line">
              {pedidosHoy.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn(
                    'w-9 h-9 rounded-xl grid place-items-center shrink-0',
                    p.estado === 'entregado' ? 'bg-emerald-50 text-emerald-700'
                    : p.estado === 'cancelado' ? 'bg-red-50 text-red-700'
                    : 'bg-amber-50 text-amber-700',
                  )}>
                    <Icon name={p.estado === 'entregado' ? 'check' : p.estado === 'cancelado' ? 'x' : 'clock'} size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-semibold text-ink/80">{p.codigo}</code>
                      <span className="text-xs text-muted truncate">· {p.cliente_nombre}</span>
                    </div>
                    <p className="text-[11px] text-muted">{new Date(p.created_at!).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="ce-display font-bold tabular-nums">{formatMXN(Number(p.total))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alertas inventario */}
        <div className="rounded-3xl border border-line bg-white p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <p className="ce-display font-bold text-lg">Stock bajo</p>
              <p className="text-xs text-muted">Ingredientes por debajo del mínimo.</p>
            </div>
          </header>
          {bajoStock.length === 0 ? (
            <EmptyHint icon="check-circle" title="Todo en orden" body="Sin ingredientes bajos de stock." />
          ) : (
            <ul className="space-y-2">
              {bajoStock.map((i) => (
                <li key={i.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                  <Icon name="alert-triangle" size={14} className="text-red-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.nombre}</p>
                    <p className="text-[11px] text-red-700">{i.stock} {i.unidad} restantes</p>
                  </div>
                  <Link href="/admin/inventario" className="text-[10px] font-bold uppercase tracking-wider text-red-700 hover:underline">Repon</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Productos top del menú */}
      <div className="rounded-3xl border border-line bg-white p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="ce-display font-bold text-lg">Tu menú</p>
            <p className="text-xs text-muted">Productos publicados en tu landing.</p>
          </div>
          <Link href="/admin/productos" className="text-xs font-semibold text-ink/70 hover:text-ink inline-flex items-center gap-1">
            Gestionar productos <Icon name="arrow-right" size={12} />
          </Link>
        </header>
        {productosTop === null ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : productosTop.length === 0 ? (
          <EmptyHint icon="package" title="Empieza tu menú" body="Crea tus primeros productos para que tu landing tenga qué mostrar." cta={{ href: '/admin/productos', label: 'Agregar producto' }} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {productosTop.map((p) => (
              <Link key={p.id} href="/admin/productos" className="group rounded-2xl border border-line overflow-hidden hover:border-ink/30 transition">
                <div className="aspect-square bg-line/40 overflow-hidden">
                  {p.imagen_url && <img src={p.imagen_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{p.nombre}</p>
                  <p className="text-[10px] text-muted">{formatMXN(Number(p.precio))}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Atajos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction href="/admin/productos"  icon="package"  title="Productos"  body="Edita tu menú" />
        <QuickAction href="/admin/branding"   icon="palette"  title="Branding"   body="Logo y colores" />
        <QuickAction href="/admin/qr"         icon="qr-code"  title="QR"         body="Imprime para tu local" />
        <QuickAction href="/admin/cupones"    icon="sparkles" title="Cupones"    body="Crea promociones" />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, highlight }: { icon: IconName; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-3xl border bg-white p-4 sm:p-5', highlight ? 'border-ink/40 shadow-soft' : 'border-line')}>
      <div className="flex items-center gap-2">
        <span className={cn('w-8 h-8 rounded-xl grid place-items-center shrink-0', highlight ? 'bg-ink text-white' : 'bg-line/40 text-ink/70')}>
          <Icon name={icon} size={14} />
        </span>
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
      </div>
      <p className={cn('ce-display text-2xl md:text-3xl font-bold mt-2 tabular-nums truncate', highlight && 'text-[color:var(--ce-accent,#FF2D2D)]')}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

function QuickAction({ href, icon, title, body }: { href: string; icon: IconName; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-white p-4 hover:-translate-y-0.5 hover:shadow-soft hover:border-ink/30 transition-all">
      <div className="w-10 h-10 rounded-xl bg-amber-50 grid place-items-center text-amber-700 mb-2">
        <Icon name={icon} size={18} />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted mt-0.5">{body}</p>
    </Link>
  );
}

function EmptyHint({ icon, title, body, cta }: { icon: IconName; title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="text-center py-6">
      <Icon name={icon} size={24} className="text-muted mx-auto" />
      <p className="ce-display text-base font-bold mt-2">{title}</p>
      <p className="text-xs text-muted mt-1">{body}</p>
      {cta && (
        <Link href={cta.href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline">
          {cta.label} <Icon name="arrow-right" size={12} />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Super admin dashboard — KPIs + actividad + accesos rápidos
   ───────────────────────────────────────────────────────────────── */
interface SaasMetrics {
  mrr_mxn: number;
  arr_mxn: number;
  trialing_count: number;
  active_count: number;
  churn_30d_pct: number;
  conversion_30d_pct: number;
  eventos_recientes: Array<{ id: number; type: string; created_at: string; processed_at: string | null }>;
}

function SuperAdminHome() {
  const [locales, setLocales] = useState<LocalAdmin[] | null>(null);
  const [metrics, setMetrics] = useState<SaasMetrics | null>(null);

  useEffect(() => {
    api.get<{ data: LocalAdmin[] }>('/admin/locales')
      .then(({ data }) => setLocales(data.data))
      .catch(() => setLocales([]));
    api.get<SaasMetrics>('/admin/saas-metrics')
      .then(({ data }) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, []);

  const total       = locales?.length ?? 0;
  const activos     = locales?.filter((l) => l.activo && !l.suspendido).length ?? 0;
  const suspendidos = locales?.filter((l) => l.suspendido).length ?? 0;
  const enPrueba    = locales?.filter((l) => l.plan_status === 'trialing').length ?? 0;
  const conProblema = locales?.filter((l) => l.plan_status === 'past_due').length ?? 0;
  const pagoExterno = locales?.filter((l) => l.pago_externo).length ?? 0;

  const recientes = (locales ?? [])
    .slice()
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 4);

  const alertas = (locales ?? []).filter((l) => l.plan_status === 'past_due' || l.suspendido).slice(0, 4);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Panel global"
        kickerIcon="store"
        title="Tus locales,"
        titleAccent="al instante."
        description="Cuántos pagan, quién está en prueba, qué se mueve en Stripe."
        actions={(
          <div className="flex gap-2 flex-wrap">
            <Link href="/admin/locales" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-ink text-white text-sm font-medium hover:opacity-90 transition">
              <Icon name="store" size={14} />
              Ir a locales
            </Link>
            <Link href="/admin/saas-metrics" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-line text-sm font-medium hover:border-ink/40 transition">
              <Icon name="chart" size={14} />
              Ver negocio
            </Link>
          </div>
        )}
      />

      {/* Fila 1: dinero */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics === null ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Kpi icon="chart" label="Ingreso mensual" value={`$${metrics.mrr_mxn.toLocaleString('es-MX')}`} sub="MXN cada mes" highlight />
            <Kpi icon="card"  label="Proyección anual" value={`$${metrics.arr_mxn.toLocaleString('es-MX')}`} sub="MXN al año" />
            <Kpi icon="check-circle" label="Pagando"    value={String(metrics.active_count)} sub="al corriente" />
            <Kpi icon="clock" label="En prueba gratis" value={String(metrics.trialing_count)} sub="convertirán pronto" />
          </>
        )}
      </section>

      {/* Fila 2: locales por estado */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {locales === null ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Kpi icon="store"        label="Locales totales" value={total.toString()} />
            <Kpi icon="bell"         label="Con pago atrasado" value={conProblema.toString()} sub={conProblema ? 'requieren atención' : 'sin alertas'} />
            <Kpi icon="sparkles"     label="Pago externo"     value={pagoExterno.toString()} sub="efectivo / transferencia" />
            <Kpi icon="lock"         label="Suspendidos"     value={suspendidos.toString()} />
          </>
        )}
      </section>

      {/* Grid: alertas + locales recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas */}
        <div className="rounded-3xl border border-line bg-white p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <p className="ce-display font-bold text-lg">Necesitan atención</p>
              <p className="text-xs text-muted">Pagos atrasados o cuentas suspendidas.</p>
            </div>
            <Link href="/admin/locales" className="text-xs font-semibold text-ink/70 hover:text-ink inline-flex items-center gap-1">
              Ver todos <Icon name="arrow-right" size={12} />
            </Link>
          </header>
          {alertas.length === 0 ? (
            <EmptyHint icon="check-circle" title="Todo en orden" body="Ningún local con pagos pendientes ni suspendidos." />
          ) : (
            <ul className="space-y-2">
              {alertas.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-100 bg-red-50/40">
                  <span className="w-8 h-8 rounded-xl grid place-items-center bg-red-100 text-red-700 shrink-0">
                    <Icon name={l.suspendido ? 'lock' : 'bell'} size={14} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{l.nombre}</p>
                    <p className="text-[11px] text-red-700">
                      {l.suspendido ? 'Suspendido' : 'Pago atrasado'}
                    </p>
                  </div>
                  <Link href={`/admin/locales`} className="text-[10px] font-bold uppercase tracking-wider text-red-700 hover:underline">
                    Revisar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Locales recientes */}
        <div className="rounded-3xl border border-line bg-white p-5">
          <header className="flex items-center justify-between mb-4">
            <div>
              <p className="ce-display font-bold text-lg">Locales recientes</p>
              <p className="text-xs text-muted">Los últimos que se sumaron a tu plataforma.</p>
            </div>
            <Link href="/admin/locales" className="text-xs font-semibold text-ink/70 hover:text-ink inline-flex items-center gap-1">
              Ver todos <Icon name="arrow-right" size={12} />
            </Link>
          </header>
          {recientes.length === 0 ? (
            <EmptyHint icon="store" title="Aún sin locales" body="Crea el primero desde la sección de Locales." />
          ) : (
            <ul className="space-y-2">
              {recientes.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                  {l.logo_url ? (
                    <img src={l.logo_url} className="w-9 h-9 rounded-xl object-cover border border-line shrink-0" alt="" />
                  ) : (
                    <span className="w-9 h-9 rounded-xl grid place-items-center text-white font-bold shrink-0" style={{ background: l.color_primario || '#0B0B0F' }}>
                      {l.nombre[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{l.nombre}</p>
                    <p className="text-[11px] text-muted truncate">/{l.slug}</p>
                  </div>
                  <Link href={`/${l.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink">
                    <Icon name="arrow-up-right" size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actividad reciente Stripe */}
      <div className="rounded-3xl border border-line bg-white p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="ce-display font-bold text-lg">Últimos movimientos de pagos</p>
            <p className="text-xs text-muted">Lo que Stripe ha procesado en las últimas horas.</p>
          </div>
          <Link href="/admin/saas-metrics" className="text-xs font-semibold text-ink/70 hover:text-ink inline-flex items-center gap-1">
            Ver todo <Icon name="arrow-right" size={12} />
          </Link>
        </header>
        {!metrics || metrics.eventos_recientes.length === 0 ? (
          <EmptyHint icon="card" title="Sin movimientos todavía" body="Cuando llegue un pago o se cree una suscripción, aparecerá aquí." />
        ) : (
          <ul className="space-y-1">
            {metrics.eventos_recientes.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                <span className="w-7 h-7 rounded-lg grid place-items-center bg-emerald-50 text-emerald-700 text-sm shrink-0">
                  ✓
                </span>
                <p className="flex-1 text-sm font-medium truncate">{friendlyStripeEvent(e.type)}</p>
                <span className="text-[11px] text-muted shrink-0">
                  {new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickAction href="/admin/locales"      icon="store"    title="Locales"    body="Alta, branding, suscripciones" />
        <QuickAction href="/admin/saas-metrics" icon="chart"    title="Negocio"    body="Ingresos y actividad" />
        <QuickAction href="/admin/locales"      icon="settings" title="Facturación" body="Cobros externos y status" />
      </div>
    </div>
  );
}

function friendlyStripeEvent(type: string): string {
  const map: Record<string, string> = {
    'invoice.payment_succeeded': 'Pago recibido',
    'invoice.paid':              'Factura pagada',
    'invoice.finalized':         'Factura emitida',
    'invoice.created':           'Factura generada',
    'invoice.payment_failed':    'Pago rechazado',
    'customer.subscription.created': 'Nueva suscripción',
    'customer.subscription.updated': 'Suscripción actualizada',
    'customer.subscription.deleted': 'Suscripción cancelada',
    'customer.created':         'Nuevo cliente en Stripe',
    'customer.updated':         'Cliente actualizado',
    'checkout.session.completed': 'Local completó su alta',
    'billing_portal.session.created': 'Cliente abrió su portal',
    'billing_portal.configuration.created': 'Portal de facturación configurado',
  };
  return map[type] ?? type.replace(/_/g, ' ').replace(/\./g, ' · ');
}
