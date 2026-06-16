'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/store/auth';
import { usePlan } from '@/store/plan';
import { useLivePedidos } from '@/store/livePedidos';
import { Toaster } from '@/components/ui/Toaster';
import { NotificacionesBell } from '@/components/admin/NotificacionesBell';
import { LivePedidosPoller } from '@/components/admin/LivePedidosPoller';
import { LocalSwitcher } from '@/components/admin/LocalSwitcher';
import { CmdKSearch } from '@/components/admin/CmdKSearch';
import { UpgradeModal } from '@/components/admin/UpgradeModal';
import { useUpgradeModal } from '@/store/upgradeModal';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PushSubscriber } from '@/components/pwa/PushSubscriber';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { PlanInactiveScreen, isPlanBlocking } from '@/components/billing/PlanInactiveScreen';
import { TourOverlay } from '@/components/help/TourOverlay';
import { AutoTourTrigger } from '@/components/help/AutoTourTrigger';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

type IconName =
  | 'home' | 'chart' | 'cart' | 'bell' | 'package' | 'list'
  | 'box' | 'receipt' | 'clock' | 'qr' | 'palette' | 'store' | 'lock' | 'card' | 'settings' | 'plug'
  | 'users' | 'history' | 'help' | 'sparkles' | 'star';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Si está, el staff DEBE tener este módulo en su permisos para verlo. Owner ignora. */
  permiso?: string;
  /** Si true, solo owner/super_admin pueden verlo. */
  ownerOnly?: boolean;
  /** Si está, el plan del local debe incluir esta feature. Si no, candado. */
  feature?: string;
  /** Plan mínimo informativo. */
  requiredPlan?: 'professional' | 'premium';
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  const stroke = {
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, className };
  switch (name) {
    case 'home':    return <svg {...common} {...stroke}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>;
    case 'chart':   return <svg {...common} {...stroke}><line x1="4" y1="20" x2="4" y2="11"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="14"/><line x1="3" y1="20.5" x2="21" y2="20.5"/></svg>;
    case 'cart':    return <svg {...common} {...stroke}><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3.5h2.5l2.4 11h11l1.8-7H7"/></svg>;
    case 'bell':    return <svg {...common} {...stroke}><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'package': return <svg {...common} {...stroke}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5"/><line x1="12" y1="12" x2="12" y2="21"/></svg>;
    case 'list':    return <svg {...common} {...stroke}><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case 'box':     return <svg {...common} {...stroke}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M2 4h20v4H2z"/><line x1="10" y1="13" x2="14" y2="13"/></svg>;
    case 'receipt': return <svg {...common} {...stroke}><path d="M5 2v20l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5 2-1.5 2 1.5V2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>;
    case 'clock':   return <svg {...common} {...stroke}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>;
    case 'qr':      return <svg {...common} {...stroke}><rect x="3" y="3" width="7" height="7" rx="0.8"/><rect x="14" y="3" width="7" height="7" rx="0.8"/><rect x="3" y="14" width="7" height="7" rx="0.8"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 17v4"/></svg>;
    case 'palette': return <svg {...common} {...stroke}><path d="M12 21a9 9 0 1 1 9-9c0 2.5-2.4 3.5-4.5 3.5h-1.5a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 21z"/><circle cx="7" cy="11" r="1"/><circle cx="11" cy="6.5" r="1"/><circle cx="16" cy="8" r="1"/></svg>;
    case 'store':   return <svg {...common} {...stroke}><path d="M3.5 9 5 4h14l1.5 5"/><path d="M3.5 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3"/><path d="M5 11.5V20h14v-8.5"/><path d="M10 20v-5h4v5"/></svg>;
    case 'lock':    return <svg {...common} {...stroke}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'card':    return <svg {...common} {...stroke}><rect x="2" y="6" width="20" height="13" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="9" y2="15"/></svg>;
    case 'users':   return <svg {...common} {...stroke}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'history': return <svg {...common} {...stroke}><path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/><line x1="12" y1="7" x2="12" y2="12"/><line x1="12" y1="12" x2="15.5" y2="14"/></svg>;
    case 'help':    return <svg {...common} {...stroke}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'sparkles': return <svg {...common} {...stroke}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>;
    case 'star':    return <svg {...common} {...stroke}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  }
}

interface UserCardData {
  nombre: string;
  email: string;
  rol: string;
}

function UserCard({ user, onLogout }: { user: UserCardData; onLogout: () => void }) {
  const initials = user.nombre.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
  const isSuper = user.rol === 'super_admin';
  const rolLabel = isSuper ? 'Super admin' : user.rol === 'owner' ? 'Propietario' : user.rol;

  return (
    <div className="border-t border-line p-3">
      <Link
        href="/admin/perfil"
        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-line/40 transition group"
        title="Ver mi perfil"
      >
        <div className={cn(
          'shrink-0 w-9 h-9 rounded-full grid place-items-center text-xs font-semibold ring-2 ring-white shadow-soft',
          isSuper ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
        )}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate leading-tight">{user.nombre}</div>
          <div className="text-[11px] text-muted truncate leading-tight mt-0.5">{user.email}</div>
          <div className="mt-1">
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-medium uppercase tracking-wider',
              isSuper ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
            )}>
              <span className={cn('w-1 h-1 rounded-full', isSuper ? 'bg-violet-500' : 'bg-emerald-500')} />
              {rolLabel}
            </span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-60 transition-opacity" aria-hidden>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </Link>
      <button
        onClick={onLogout}
        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-line text-sm font-medium text-ink hover:bg-line/40 hover:border-ink/30 transition tap-target"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Cerrar sesión
      </button>
    </div>
  );
}

/**
 * NavItem.permiso = key del módulo que debe estar en user.permisos para que
 * se renderice. Owner siempre tiene todos los módulos (ver puedeAcceder en
 * backend). Items sin permiso = visibles para todos (Inicio, Equipo solo
 * owner se filtra aparte).
 */
const NAV_OWNER: NavItem[] = [
  { href: '/admin',              label: 'Inicio',      icon: 'home' },
  { href: '/admin/metricas',     label: 'Reportes',    icon: 'chart',   permiso: 'metricas',   feature: 'metricas_basicas', requiredPlan: 'professional' },
  { href: '/admin/punto-venta',  label: 'Venta',       icon: 'cart',    permiso: 'pos',        feature: 'pos' },
  { href: '/admin/pedidos',      label: 'Pedidos',     icon: 'bell',    permiso: 'pedidos' },
  { href: '/admin/productos',    label: 'Productos',   icon: 'package', permiso: 'productos' },
  { href: '/admin/categorias',   label: 'Categorías',  icon: 'list',    permiso: 'categorias' },
  { href: '/admin/inventario',   label: 'Inventario',  icon: 'box',     permiso: 'inventario', feature: 'inventario',       requiredPlan: 'professional' },
  { href: '/admin/compras',      label: 'Compras',     icon: 'receipt', permiso: 'compras',    feature: 'compras',          requiredPlan: 'professional' },
  { href: '/admin/horarios',     label: 'Horarios',    icon: 'clock',   permiso: 'horarios' },
  { href: '/admin/qr',           label: 'QR',          icon: 'qr',      permiso: 'qr',         feature: 'qr_personalizado' },
  { href: '/admin/cupones',      label: 'Cupones',     icon: 'sparkles' },
  { href: '/admin/referidos',    label: 'Referidos',   icon: 'users',   ownerOnly: true },
  { href: '/admin/branding',     label: 'Branding',    icon: 'palette', permiso: 'branding' },
  { href: '/admin/staff',        label: 'Equipo',      icon: 'users',   ownerOnly: true,       feature: 'staff_multi',      requiredPlan: 'professional' },
  { href: '/admin/audit-log',    label: 'Historial',   icon: 'history', permiso: 'audit_log',  feature: 'audit_log',        requiredPlan: 'professional' },
  { href: '/admin/integraciones', label: 'Integraciones', icon: 'plug', ownerOnly: true, feature: 'api_webhooks', requiredPlan: 'premium' },
  { href: '/admin/billing',      label: 'Suscripción', icon: 'card',    ownerOnly: true },
  { href: '/admin/ayuda',        label: 'Centro de ayuda', icon: 'help' },
];

const NAV_SUPER: NavItem[] = [
  { href: '/admin',              label: 'Resumen',  icon: 'home' },
  { href: '/admin/locales',      label: 'Locales',  icon: 'store' },
  { href: '/admin/saas-metrics', label: 'SaaS',     icon: 'chart' },
];

function SidebarHeader({ rol, showBell }: { rol: string; showBell: boolean }) {
  return (
    <div className="border-b border-line">
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href="/admin" className="block">
            <Logo variant="lockup" size={28} />
          </Link>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span className="w-1 h-1 rounded-full bg-ink/40" />
            {rol === 'super_admin' ? 'Panel global' : 'Panel del local'}
          </span>
        </div>
        {showBell && <NotificacionesBell />}
      </div>
      <LocalSwitcher />
    </div>
  );
}

function NavLinks({ items, pathname, dense = false }: { items: NavItem[]; pathname: string; dense?: boolean }) {
  const has    = usePlan((s) => s.has);
  const unread = useLivePedidos((s) => s.unread);
  const showUpgrade = useUpgradeModal((s) => s.show);
  return (
    <nav className="flex-1 py-3 px-2 overflow-y-auto scroll-fine space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        const locked = !!item.feature && !has(item.feature);
        const showBadge = item.href === '/admin/pedidos' && unread > 0 && !active;

        const handleLockedClick = (e: React.MouseEvent) => {
          if (!locked) return;
          e.preventDefault();
          e.stopPropagation();
          showUpgrade({
            feature: item.feature!,
            requiredPlan: (item.requiredPlan as 'professional' | 'premium') ?? 'professional',
            moduleLabel: item.label,
          });
        };

        return (
          <Link
            key={item.href}
            href={locked ? '#' : item.href}
            onClick={handleLockedClick}
            data-tour={`sidebar-${item.href.replace('/admin', '').replace('/', '') || 'inicio'}`}
            className={cn(
              'group flex items-center gap-3 rounded-lg transition relative',
              dense ? 'px-3 py-2.5 text-base' : 'px-3 py-2 text-sm',
              active
                ? 'bg-ink text-white font-semibold shadow-soft'
                : 'text-ink/70 hover:bg-line/40 hover:text-ink font-medium',
              locked && !active && 'opacity-60 cursor-pointer',
            )}
            title={locked ? `Mejora a plan ${item.requiredPlan === 'premium' ? 'Premium' : 'Profesional'} para desbloquear` : undefined}
          >
            <Icon
              name={item.icon}
              className={cn(
                'shrink-0 transition-opacity',
                active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
              )}
            />
            <span className="truncate flex-1">{item.label}</span>
            {showBadge && (
              <span
                className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[color:var(--ce-accent,#FF2D2D)] text-white text-[10px] font-bold grid place-items-center halo-pulse"
                aria-label={`${unread} pedidos nuevos`}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            {locked && (
              <Icon
                name="lock"
                className={cn('shrink-0 opacity-60', active ? 'text-white' : 'text-muted')}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user    = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const logout  = useAuth((s) => s.logout);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => {
        if (!useAuth.getState().user) router.replace('/login');
      }, 200);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  // Cerrar drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const nav = useMemo<NavItem[]>(() => {
    if (user?.rol === 'super_admin') return NAV_SUPER;
    if (!user) return [];

    const isOwner = user.rol === 'owner';
    const permisos = user.permisos;

    return NAV_OWNER.filter((item) => {
      if (item.ownerOnly && !isOwner) return false;
      // Owner siempre ve todo
      if (isOwner) return true;
      // Staff: si no requiere permiso, lo ve (caso "Inicio"). Si requiere, debe tenerlo.
      if (!item.permiso) return true;
      return permisos?.includes(item.permiso) ?? false;
    });
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <span className="text-sm text-muted">Cargando…</span>
      </main>
    );
  }

  // Pantalla bloqueante si el plan SaaS no está activo (solo owner+staff).
  // Excepción: dejamos pasar las páginas de Suscripción y Perfil para que el
  // dueño pueda reactivar o cerrar sesión sin quedar atrapado.
  const plan = usePlan.getState().plan;
  const blocked = user.rol !== 'super_admin'
    && isPlanBlocking(plan)
    && pathname !== null
    && !pathname.startsWith('/admin/billing')
    && !pathname.startsWith('/admin/perfil');

  if (blocked) {
    return <PlanInactiveScreen />;
  }

  return (
    <div className="min-h-screen bg-bg md:flex">
      {/* ─── SIDEBAR DESKTOP ─────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-line bg-white flex-col h-screen sticky top-0">
        <SidebarHeader rol={user.rol} showBell={user.rol !== 'super_admin'} />
        <NavLinks items={nav} pathname={pathname ?? ''} />
        <UserCard user={user} onLogout={() => logout().then(() => router.push('/'))} />
      </aside>

      {/* ─── MAIN AREA ───────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 min-h-screen">
        {/* Banner del plan (trial countdown / pago fallido / cancelado) — sólo owner+staff */}
        {user.rol !== 'super_admin' && <TrialBanner />}

        {/* TOPBAR MÓVIL con hamburger */}
        <header className="md:hidden flex items-center justify-between gap-2 px-3 py-2.5 border-b border-line bg-white sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="tap-target rounded-xl hover:bg-line/50 grid place-items-center"
          >
            <span className="text-xl">☰</span>
          </button>
          <Link href="/admin" className="flex-1 truncate">
            <Logo variant="lockup" size={24} />
          </Link>
          <div className="flex items-center gap-1">
            {user.rol !== 'super_admin' && <NotificacionesBell />}
          </div>
        </header>

        {/* DRAWER MÓVIL */}
        <AnimatePresence>
          {drawerOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <motion.div
                className="absolute inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative w-72 max-w-[85vw] bg-white h-full shadow-glass flex flex-col"
              >
                <div className="px-4 pt-5 pb-4 border-b border-line flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Logo variant="lockup" size={28} />
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      <span className="w-1 h-1 rounded-full bg-ink/40" />
                      {user.rol === 'super_admin' ? 'Panel global' : 'Panel del local'}
                    </span>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Cerrar menú"
                    className="tap-target rounded-xl hover:bg-line/50 grid place-items-center"
                  >
                    ✕
                  </button>
                </div>
                <NavLinks items={nav} pathname={pathname ?? ''} dense />
                <UserCard user={user} onLogout={() => logout().then(() => router.push('/'))} />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <div className="px-3 sm:px-4 md:px-8 py-4 md:py-10 max-w-6xl mx-auto pb-12">
          {children}
        </div>

        <Toaster />
      </main>

      {/* F85 — búsqueda global Cmd+K, montada para todo el panel */}
      <CmdKSearch />

      {/* Modal de upgrade que aparece al hacer click en módulos con candado */}
      <UpgradeModal />

      {/* Tour interactivo + auto-trigger del onboarding en /admin */}
      {user.rol !== 'super_admin' && (
        <>
          <TourOverlay />
          <AutoTourTrigger pathname={pathname} />
          <LivePedidosPoller />
          <PedidosReadResetter pathname={pathname} />
          <InstallPrompt />
          <PushSubscriber />
        </>
      )}
    </div>
  );
}

/** Resetea el contador de "unread" cuando el owner entra a /admin/pedidos. */
function PedidosReadResetter({ pathname }: { pathname: string }) {
  const markAllRead = useLivePedidos((s) => s.markAllRead);
  useEffect(() => {
    if (pathname.startsWith('/admin/pedidos')) markAllRead();
  }, [pathname, markAllRead]);
  return null;
}
