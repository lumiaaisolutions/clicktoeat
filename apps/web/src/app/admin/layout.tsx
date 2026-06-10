'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/store/auth';
import { Toaster } from '@/components/ui/Toaster';
import { NotificacionesBell } from '@/components/admin/NotificacionesBell';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

type IconName =
  | 'home' | 'chart' | 'cart' | 'bell' | 'package' | 'list'
  | 'box' | 'receipt' | 'clock' | 'qr' | 'palette' | 'store';

interface NavItem { href: string; label: string; icon: IconName }

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

const NAV_OWNER: NavItem[] = [
  { href: '/admin',              label: 'Inicio',      icon: 'home' },
  { href: '/admin/metricas',     label: 'Reportes',    icon: 'chart' },
  { href: '/admin/punto-venta',  label: 'Venta',       icon: 'cart' },
  { href: '/admin/pedidos',      label: 'Pedidos',     icon: 'bell' },
  { href: '/admin/productos',    label: 'Productos',   icon: 'package' },
  { href: '/admin/categorias',   label: 'Categorías',  icon: 'list' },
  { href: '/admin/inventario',   label: 'Inventario',  icon: 'box' },
  { href: '/admin/compras',      label: 'Compras',     icon: 'receipt' },
  { href: '/admin/horarios',     label: 'Horarios',    icon: 'clock' },
  { href: '/admin/qr',           label: 'QR',          icon: 'qr' },
  { href: '/admin/branding',     label: 'Branding',    icon: 'palette' },
];

const NAV_SUPER: NavItem[] = [
  { href: '/admin',          label: 'Resumen',  icon: 'home' },
  { href: '/admin/locales',  label: 'Locales',  icon: 'store' },
];

function SidebarHeader({ rol, showBell }: { rol: string; showBell: boolean }) {
  return (
    <div className="px-4 pt-5 pb-4 border-b border-line flex items-start justify-between gap-2">
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
  );
}

function NavLinks({ items, pathname, dense = false }: { items: NavItem[]; pathname: string; dense?: boolean }) {
  return (
    <nav className="flex-1 py-3 px-2 overflow-y-auto scroll-fine space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group flex items-center gap-3 rounded-lg transition relative',
              dense ? 'px-3 py-2.5 text-base' : 'px-3 py-2 text-sm',
              active
                ? 'bg-ink text-white font-semibold shadow-soft'
                : 'text-ink/70 hover:bg-line/40 hover:text-ink font-medium',
            )}
          >
            <Icon
              name={item.icon}
              className={cn(
                'shrink-0 transition-opacity',
                active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
              )}
            />
            <span className="truncate">{item.label}</span>
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

  const nav = useMemo<NavItem[]>(
    () => (user?.rol === 'super_admin' ? NAV_SUPER : NAV_OWNER),
    [user?.rol],
  );

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center">
        <span className="text-sm text-muted">Cargando…</span>
      </main>
    );
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
    </div>
  );
}
