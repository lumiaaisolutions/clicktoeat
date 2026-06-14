'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCart } from '@/store/cart';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn, formatMXN } from '@/lib/utils';
import type { MenuResponse, MenuProducto } from '@/lib/api';
import { Icon, type IconName } from '@/components/ui/Icon';
import 'leaflet/dist/leaflet.css';

const LeafletMap = dynamic(() => import('@/components/admin/LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-xl border border-line bg-line/30 animate-pulse" />,
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Local     = MenuResponse['data']['local'];
type Branding  = MenuResponse['data']['branding'];
type Categoria = MenuResponse['data']['categorias'][number];
type Producto  = MenuProducto;

interface Props { menu: MenuResponse['data']; }

export function LandingClient({ menu }: Props) {
  const { local, branding, categorias, productos } = menu;
  const cart = useCart();

  const estado     = (local as any).estado as { abierto: boolean | null; mensaje: string } | undefined;
  const cerrado    = estado?.abierto === false;
  const horarioStr = useMemo(() => formatHorarios(local.horarios), [local.horarios]);
  const initial    = (local.nombre || '?').trim().charAt(0).toUpperCase();

  const [activeCat,    setActiveCat]    = useState<string | null>(categorias[0]?.slug ?? null);
  const [cartOpen,     setCartOpen]     = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [detail,       setDetail]       = useState<Producto | null>(null);
  const [dark,         setDark]         = useState<boolean>(!!branding.darkMode);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { cart.setLocal(local.slug); }, [local.slug]);

  const productosFiltrados = useMemo(
    () => (activeCat ? productos.filter((p) => p.categoria.slug === activeCat) : productos),
    [activeCat, productos],
  );

  const activeCategoria = useMemo(
    () => categorias.find((c) => c.slug === activeCat) ?? null,
    [activeCat, categorias],
  );

  const itemCount = mounted ? cart.itemCount() : 0;
  const subtotal  = mounted ? cart.subtotal()  : 0;

  return (
    <div
      className={cn('ce-warm min-h-screen', dark && 'ce-dark')}
      style={{
        ['--ce-accent' as any]: branding.colorPrimario,
        background: dark ? 'var(--ce-bg)' : (branding.colorFondo || '#FBF8F3'),
        color:      'var(--ce-ink)',
      }}
    >
      {/* ===================== HERO ===================== */}
      <header
        className="relative w-full overflow-hidden bg-[#F3ECE1]"
        style={{ height: 'clamp(440px, 76vh, 660px)' }}
      >
        {branding.banner && (
          <motion.img
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }}
            src={branding.banner}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay 4-stop para legibilidad en cualquier banner */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(20,12,6,.30) 0%, rgba(20,12,6,.05) 32%, rgba(20,12,6,.20) 62%, rgba(20,12,6,.74) 100%)',
          }}
        />

        {/* TOP BAR — avatar inicial glass + theme toggle */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            {branding.logo ? (
              <img
                src={branding.logo}
                alt={local.nombre}
                className="w-12 h-12 sm:w-[46px] sm:h-[46px] rounded-full object-cover border border-white/40 shadow-[0_6px_18px_rgba(0,0,0,0.25)] bg-white"
              />
            ) : (
              <div
                className="w-12 h-12 sm:w-[46px] sm:h-[46px] rounded-full grid place-items-center text-white ce-serif text-2xl border border-white/35 shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
                style={{
                  background: 'rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(14px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(140%)',
                }}
              >
                {initial}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-label="Cambiar tema"
            className="w-11 h-11 rounded-full grid place-items-center text-white border border-white/35 hover:-translate-y-0.5 hover:bg-white/30 transition tap-target"
            style={{
              background: 'rgba(255,255,255,0.16)',
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            }}
          >
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
          </button>
        </div>

        {/* HERO TEXT — tagline pequeño uppercase + nombre Instrument Serif gigante */}
        <div className="absolute inset-x-0 bottom-[118px] z-[5] px-4 sm:px-6 md:px-10 text-center">
          {local.tagline && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.86, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-white text-[12px] font-semibold uppercase mb-2.5"
              style={{ letterSpacing: '0.32em', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}
            >
              {local.tagline}
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            className="ce-serif text-white m-0"
            style={{
              fontSize: 'clamp(46px, 9vw, 84px)',
              lineHeight: 0.98,
              textShadow: '0 4px 30px rgba(0,0,0,.45)',
            }}
          >
            {local.nombre}
          </motion.h1>
        </div>

        {/* SCROLL HINT — chevron con bob */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-5 z-[5] text-white/80 ce-bob">
          <Icon name="chevron-down" size={20} />
        </div>
      </header>

      {/* ===================== MAIN ===================== */}
      <main className="relative z-[2] max-w-[1140px] mx-auto px-[clamp(14px,3.5vw,28px)] pb-0">
        {/* INFO CARD FLOTANTE — status + horario + ubicación. -mt-70 sobre hero */}
        <section className="relative z-[8] flex justify-center" style={{ marginTop: '-70px' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[640px] rounded-3xl bg-surface border border-line p-4 sm:p-5 md:px-7 md:py-5 flex flex-wrap items-center gap-y-3 hover:-translate-y-[3px] transition-transform duration-400"
            style={{ boxShadow: '0 24px 60px -20px rgba(35,25,15,.28)' }}
          >
            {/* Status dot */}
            <div className="flex items-center gap-2.5 shrink-0 pr-4 md:pr-6">
              {(() => {
                const isOpen   = estado?.abierto === true;
                const isClosed = estado?.abierto === false;
                const color    = isClosed ? '#DC2626' : isOpen ? '#2DA05A' : '#A89C90';
                const label    = isClosed ? 'Cerrado' : isOpen ? 'Abierto' : 'Sin horario';
                return (
                  <>
                    <span
                      className="w-2.5 h-2.5 rounded-full ce-pulse-dot"
                      style={{
                        background: color,
                        ['--ce-dot-glow' as any]: `${color}80`,
                      }}
                    />
                    <div className="flex flex-col leading-tight">
                      <span className="text-[15px] font-extrabold ce-body" style={{ color }}>
                        {label}
                      </span>
                      <span
                        className="text-[11px] font-semibold uppercase"
                        style={{ color: 'var(--ce-muted)', letterSpacing: '0.12em' }}
                      >
                        Ahora
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            <span aria-hidden className="hidden sm:block w-px self-stretch bg-line" />

            {/* Horario */}
            <div className="flex items-center gap-3 flex-1 min-w-[130px] pl-0 sm:pl-5 md:pl-6">
              <Icon name="clock" size={16} style={{ color: 'var(--ce-accent)' }} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13.5px] font-bold truncate">Horario</span>
                <span className="text-[11.5px] truncate" style={{ color: 'var(--ce-muted)' }}>
                  {horarioStr}
                </span>
              </div>
            </div>

            <span aria-hidden className="hidden sm:block w-px self-stretch bg-line" />

            {/* Ubicación */}
            <div className="flex items-center gap-3 flex-1 min-w-[130px] pl-0 sm:pl-5 md:pl-6">
              <Icon name="map-pin" size={16} style={{ color: 'var(--ce-accent)' }} />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13.5px] font-bold truncate">Ubicación</span>
                <span className="text-[11.5px] truncate" style={{ color: 'var(--ce-muted)' }}>
                  {local.direccion || 'Consultar'}
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* BANNER CERRADO premium — solo si cerrado, debajo del info card */}
        {cerrado && (
          <ClosedBanner mensaje={estado?.mensaje} />
        )}
      </main>

      {/* STICKY CATEGORY BAR — chips horizontales scroll-x */}
      <div
        className="sticky top-0 z-30 border-b border-line"
        style={{
          background: dark ? 'rgba(22,17,13,.82)' : 'rgba(251,248,243,.82)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          marginTop: 26,
        }}
      >
        <div className="max-w-[1140px] mx-auto px-[clamp(10px,3vw,28px)]">
          <div className="ce-chips-scroll flex gap-2.5 overflow-x-auto py-3 px-0.5">
            {categorias.map((c) => (
              <CategoryChip
                key={c.slug}
                categoria={c}
                active={activeCat === c.slug}
                onClick={() => setActiveCat(c.slug)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCT SECTION — solo categoría activa, grid responsive */}
      <main
        id="menu-top"
        className="max-w-[1140px] mx-auto px-[clamp(14px,3.5vw,28px)] pb-16"
        style={{ paddingTop: 14, scrollMarginTop: 74 }}
      >
        <div className="flex items-baseline gap-3 my-7">
          <h3
            className="ce-serif m-0 shrink-0 whitespace-nowrap"
            style={{ fontSize: 'clamp(26px, 4.6vw, 38px)' }}
          >
            {activeCategoria?.nombre || 'Menú'}
          </h3>
          <span
            aria-hidden
            className="flex-1 h-px"
            style={{
              background: 'linear-gradient(to right, color-mix(in srgb, var(--ce-ink) 14%, transparent), transparent)',
            }}
          />
          <span
            className="text-xs font-semibold whitespace-nowrap"
            style={{ color: 'var(--ce-muted)' }}
          >
            {productosFiltrados.length} {productosFiltrados.length === 1 ? 'platillo' : 'platillos'}
          </span>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center text-muted text-sm">
            No hay productos en esta categoría.
          </div>
        ) : (
          <div
            key={activeCat ?? 'all'}
            className="ce-fade-swap grid gap-[clamp(14px,2.4vw,22px)]"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}
          >
            {productosFiltrados.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                cerrado={cerrado}
                onOpen={() => setDetail(p)}
                onAdd={() => {
                  cart.add({
                    productoId: p.id,
                    nombre:     p.nombre,
                    precio:     p.precio,
                    imagen:     p.imagen ?? null,
                    extras:     [],
                    lineKey:    `${p.id}`,
                    cantidad:   1,
                  });
                  setCartOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* FOOTER — restaurante premium dark con LUMIA credit */}
      <Footer local={local} branding={branding} />

      {/* CART FAB — sheen + ring + count pop */}
      <CartFab
        count={itemCount}
        subtotal={subtotal}
        cerrado={cerrado}
        onClick={() => setCartOpen(true)}
      />

      <CartDrawer
        open={cartOpen}
        cerrado={cerrado}
        onClose={() => setCartOpen(false)}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />

      <ProductDetailSheet
        producto={detail}
        cerrado={cerrado}
        onClose={() => setDetail(null)}
        onAdd={(qty) => {
          if (!detail) return;
          cart.add({
            productoId: detail.id,
            nombre:     detail.nombre,
            precio:     detail.precio,
            imagen:     detail.imagen ?? null,
            extras:     [],
            lineKey:    `${detail.id}`,
            cantidad:   qty,
          });
          setDetail(null);
          setCartOpen(true);
        }}
      />

      <CheckoutSheet
        open={checkoutOpen}
        cerrado={cerrado}
        mensajeCerrado={estado?.mensaje}
        onClose={() => setCheckoutOpen(false)}
        local={local}
      />
    </div>
  );
}

/* ───── Banner CERRADO ───── */

function ClosedBanner({ mensaje }: { mensaje?: string }) {
  const limpio = (mensaje ?? '').replace(/^(Abierto|Cerrado)\s*[·.,-]?\s*/i, '').trim() || 'Vuelve más tarde.';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
      className="relative mt-4 rounded-2xl bg-red-50 border border-red-100 overflow-hidden"
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600" />
      <div className="px-5 sm:px-7 py-4 sm:py-5 flex items-center gap-4">
        <span className="relative shrink-0 w-12 h-12 rounded-full bg-white border border-red-200 grid place-items-center text-red-600">
          <span aria-hidden className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
          <Icon name="clock" size={18} className="relative" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="ce-serif text-lg sm:text-xl text-red-900 leading-tight m-0">
            Volvemos pronto
          </p>
          <p className="text-xs sm:text-sm text-red-700/80 mt-0.5 leading-relaxed m-0">
            {limpio}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase shadow-sm shrink-0" style={{ letterSpacing: '0.15em' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white halo-pulse" />
          Cerrado
        </span>
      </div>
    </motion.div>
  );
}

/* ───── Category Chip — pill horizontal con icono pequeño + nombre ───── */

function CategoryChip({
  categoria, active, onClick,
}: { categoria: Categoria; active: boolean; onClick: () => void }) {
  const icon = (categoria.icono as IconName | undefined) ?? iconForCategoria(categoria.nombre);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap font-semibold text-[13px] rounded-full transition-all duration-300 px-4 py-2.5 border',
        active
          ? 'text-white border-transparent shadow-[0_8px_22px_-8px_rgba(0,0,0,0.32)] hover:-translate-y-0.5'
          : 'border-line bg-surface hover:border-ink/30 hover:-translate-y-0.5',
      )}
      style={active ? {
        background: 'linear-gradient(135deg, var(--ce-accent) 0%, color-mix(in srgb, var(--ce-accent) 78%, black) 100%)',
      } : undefined}
    >
      <Icon name={icon} size={13} strokeWidth={2.4} />
      <span>{categoria.nombre}</span>
    </button>
  );
}

/* ───── Product Card — imagen aspect 16/11 con hover scale + precio accent + + ───── */

function ProductCard({
  producto, cerrado, onOpen, onAdd,
}: {
  producto: Producto;
  cerrado:  boolean;
  onOpen:   () => void;
  onAdd:    () => void;
}) {
  return (
    <article
      onClick={onOpen}
      className="ce-card relative bg-surface border border-line rounded-3xl overflow-hidden cursor-pointer"
      style={{ boxShadow: '0 10px 30px -12px rgba(35,25,15,.18)' }}
    >
      {/* Imagen */}
      <div className="relative w-full overflow-hidden bg-[#FBF7F1]" style={{ aspectRatio: '16 / 11' }}>
        <div className="ce-pimg absolute inset-0">
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted text-xs">
              <Icon name="utensils" size={32} className="opacity-30" />
            </div>
          )}
        </div>
        {producto.tag && (
          <span
            className="absolute top-3 left-3 z-10 text-[10px] uppercase px-2.5 py-1 rounded-full text-white font-bold shadow-sm"
            style={{
              background: 'var(--ce-accent)',
              letterSpacing: '0.08em',
            }}
          >
            {producto.tag}
          </span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-4 pb-[17px]">
        <h4 className="ce-body font-bold text-[16.5px] leading-snug m-0 mb-1.5">
          {producto.nombre}
        </h4>
        {producto.descripcion && (
          <p
            className="text-[13px] leading-[1.5] m-0 mb-3.5"
            style={{
              color: 'var(--ce-muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {producto.descripcion}
          </p>
        )}
        <div className="flex items-center justify-between gap-2.5">
          <span
            className="ce-body font-extrabold text-lg tabular-nums"
            style={{ color: 'var(--ce-accent)', letterSpacing: '-0.01em' }}
          >
            {formatMXN(producto.precio)}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!cerrado) onAdd(); }}
            disabled={cerrado}
            aria-label="Añadir"
            className="w-11 h-11 rounded-2xl border-0 text-white grid place-items-center transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed tap-target"
            style={{
              background: 'linear-gradient(135deg, var(--ce-accent) 0%, color-mix(in srgb, var(--ce-accent) 72%, black) 100%)',
              boxShadow: '0 6px 16px -6px color-mix(in srgb, var(--ce-accent) 50%, transparent)',
            }}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ───── Product Detail Sheet — bottom sheet con cantidad + Agregar ───── */

function ProductDetailSheet({
  producto, cerrado, onClose, onAdd,
}: {
  producto: Producto | null;
  cerrado:  boolean;
  onClose:  () => void;
  onAdd:    (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  useEffect(() => { if (producto) setQty(1); }, [producto]);

  return (
    <AnimatePresence>
      {producto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: 'rgba(20,12,6,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="w-full max-w-[480px] bg-surface overflow-y-auto rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] sm:max-h-[86vh] shadow-[0_-20px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="relative w-full overflow-hidden bg-[#FBF7F1]" style={{ aspectRatio: '16 / 10' }}>
              {producto.imagen ? (
                <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center">
                  <Icon name="utensils" size={56} className="opacity-25" />
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="absolute top-3.5 right-3.5 w-10 h-10 rounded-full bg-white/95 text-ink grid place-items-center shadow-md hover:rotate-90 transition-transform duration-200 tap-target"
              >
                <Icon name="x" size={16} />
              </button>
              {producto.tag && (
                <span
                  className="absolute top-3.5 left-3.5 text-[10px] uppercase px-2.5 py-1 rounded-full text-white font-bold shadow-sm"
                  style={{ background: 'var(--ce-accent)', letterSpacing: '0.08em' }}
                >
                  {producto.tag}
                </span>
              )}
            </div>

            <div className="p-5 sm:p-7 pt-6">
              <h3 className="ce-serif text-3xl leading-[1.05] m-0 mb-2">{producto.nombre}</h3>
              {producto.descripcion && (
                <p className="text-[14.5px] leading-relaxed m-0 mb-6" style={{ color: 'var(--ce-muted)' }}>
                  {producto.descripcion}
                </p>
              )}
              <div className="flex items-center justify-between gap-4 mb-6">
                <span
                  className="ce-body font-extrabold text-[26px] tabular-nums"
                  style={{ color: 'var(--ce-accent)', letterSpacing: '-0.01em' }}
                >
                  {formatMXN(producto.precio)}
                </span>
                <div
                  className="flex items-center gap-1 rounded-full p-1.5 border border-line"
                  style={{ background: '#FBF7F1' }}
                >
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty === 1}
                    aria-label="Restar"
                    className="w-[38px] h-[38px] rounded-full bg-surface text-ink grid place-items-center shadow-sm active:scale-90 disabled:opacity-40 transition-transform"
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="min-w-[34px] text-center text-lg font-extrabold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Sumar"
                    className="w-[38px] h-[38px] rounded-full bg-surface text-ink grid place-items-center shadow-sm active:scale-90 transition-transform"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !cerrado && onAdd(qty)}
                disabled={cerrado}
                className={cn(
                  'w-full h-14 rounded-2xl text-white ce-body font-extrabold text-base inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed tap-target',
                )}
                style={{
                  background: cerrado
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, var(--ce-accent) 0%, color-mix(in srgb, var(--ce-accent) 72%, black) 100%)',
                  boxShadow: cerrado ? undefined : '0 14px 30px -10px color-mix(in srgb, var(--ce-accent) 50%, transparent)',
                }}
              >
                {cerrado ? (
                  <><Icon name="alert-triangle" size={16} /> Local cerrado</>
                ) : (
                  <><Icon name="plus" size={16} /> Añadir · {formatMXN(producto.precio * qty)}</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Cart FAB — sheen + ring pulse + count badge pop ───── */

function CartFab({
  count, subtotal, cerrado, onClick,
}: { count: number; subtotal: number; cerrado: boolean; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <motion.button
      type="button"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      onClick={onClick}
      className={cn(
        'fixed z-40 h-16 pr-6 pl-[9px] border-0 rounded-[34px] text-white cursor-pointer flex items-center gap-3 overflow-hidden transition-all duration-200 hover:-translate-y-[3px] hover:brightness-110 active:scale-[0.96]',
      )}
      style={{
        right:  'clamp(16px, 4vw, 30px)',
        bottom: 'max(env(safe-area-inset-bottom), clamp(16px, 4vw, 30px))',
        background: cerrado
          ? '#6B7280'
          : 'linear-gradient(135deg, var(--ce-accent) 0%, color-mix(in srgb, var(--ce-accent) 72%, black) 100%)',
        boxShadow:
          '0 18px 42px -10px color-mix(in srgb, var(--ce-accent) 60%, transparent), inset 0 1px 0 rgba(255,255,255,.28)',
      }}
    >
      <span
        aria-hidden
        className="ce-cart-ring absolute inset-[-3px] rounded-[36px] border-2 pointer-events-none"
        style={{ borderColor: 'var(--ce-accent)' }}
      />
      <span
        aria-hidden
        className="ce-sheen absolute top-0 left-0 w-1/3 h-full pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)' }}
      />
      <span className="relative z-[1] grid place-items-center w-[46px] h-[46px] rounded-full shrink-0" style={{ background: 'rgba(255,255,255,.2)' }}>
        <Icon name="utensils" size={18} />
        <span
          key={count}
          className="ce-pop absolute -top-1.5 -right-[7px] min-w-[21px] h-[21px] px-1.5 rounded-full bg-white text-[11.5px] font-extrabold grid place-items-center"
          style={{ color: 'var(--ce-accent)', boxShadow: '0 3px 9px rgba(0,0,0,.22)' }}
        >
          {count}
        </span>
      </span>
      <span className="relative z-[1] flex flex-col items-start leading-[1.08] pr-1">
        <span className="text-[10px] font-semibold opacity-90 uppercase" style={{ letterSpacing: '0.12em' }}>
          Mi pedido
        </span>
        <span className="text-[17px] font-extrabold" style={{ letterSpacing: '-0.01em' }}>
          {cerrado ? 'Cerrado' : formatMXN(subtotal)}
        </span>
      </span>
    </motion.button>
  );
}

/* ───── Cart Drawer — panel derecha estilo HTML ───── */

function CartDrawer({
  open, cerrado, onClose, onCheckout,
}: { open: boolean; cerrado: boolean; onClose: () => void; onCheckout: () => void }) {
  const cart = useCart();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex justify-end"
          style={{ background: 'rgba(20,12,6,.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <motion.aside
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-[min(440px,92vw)] h-full flex flex-col bg-surface shadow-[-20px_0_60px_rgba(0,0,0,0.3)]"
          >
            <header className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-line">
              <div>
                <div
                  className="text-[11px] font-bold uppercase mb-0.5"
                  style={{ color: 'var(--ce-accent)', letterSpacing: '0.2em' }}
                >
                  Tu pedido
                </div>
                <h3 className="ce-serif text-2xl m-0">{cart.itemCount()} artículos</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="w-[42px] h-[42px] rounded-full border border-line grid place-items-center hover:rotate-90 transition-transform"
                style={{ background: '#FBF7F1' }}
              >
                <Icon name="x" size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto scroll-fine px-3 sm:px-5 py-2">
              {cart.items.length === 0 ? (
                <div className="p-10 text-center text-muted text-sm">Carrito vacío</div>
              ) : cart.items.map((i, idx) => (
                <div
                  key={i.lineKey}
                  className="ce-row-in flex items-center gap-3 p-3 mb-2.5 rounded-2xl border border-line transition-all duration-250 hover:-translate-x-[3px]"
                  style={{ background: '#FBF7F1', animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden shrink-0 bg-surface">
                    {i.imagen ? (
                      <img src={i.imagen} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><Icon name="utensils" size={20} className="opacity-30" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-bold leading-snug mb-0.5 truncate">{i.nombre}</div>
                    <div className="text-[13px] font-bold" style={{ color: 'var(--ce-accent)' }}>
                      {formatMXN(i.precio * i.cantidad)}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-full border border-line p-1 shrink-0" style={{ background: '#FBF7F1' }}>
                    <button
                      type="button"
                      onClick={() => cart.setQty(i.lineKey, i.cantidad - 1)}
                      aria-label="Restar"
                      className="w-[30px] h-[30px] rounded-full bg-surface grid place-items-center shadow-sm active:scale-90 transition-transform"
                    >
                      <Icon name="minus" size={12} />
                    </button>
                    <span className="min-w-[26px] text-center text-sm font-extrabold tabular-nums">{i.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => cart.setQty(i.lineKey, i.cantidad + 1)}
                      aria-label="Sumar"
                      className="w-[30px] h-[30px] rounded-full bg-surface grid place-items-center shadow-sm active:scale-90 transition-transform"
                    >
                      <Icon name="plus" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <footer className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 border-t border-line bg-surface pb-safe">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold" style={{ color: 'var(--ce-muted)' }}>Total</span>
                <span className="ce-body text-[26px] font-extrabold tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  {formatMXN(cart.subtotal())}
                </span>
              </div>
              {cerrado && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  🔒 El local está cerrado. No puedes finalizar el pedido en este momento.
                </div>
              )}
              <button
                type="button"
                onClick={onCheckout}
                disabled={cart.itemCount() === 0 || cerrado}
                className="w-full h-14 rounded-2xl text-white ce-body font-extrabold text-base inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed tap-target"
                style={{
                  background: cerrado
                    ? '#9CA3AF'
                    : 'linear-gradient(135deg, var(--ce-accent) 0%, color-mix(in srgb, var(--ce-accent) 72%, black) 100%)',
                  boxShadow: cerrado ? undefined : '0 14px 30px -10px color-mix(in srgb, var(--ce-accent) 50%, transparent)',
                }}
              >
                {cerrado ? 'Cerrado' : (<>Confirmar pedido <Icon name="arrow-right" size={16} /></>)}
              </button>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── Checkout Sheet — bottom sheet con datos cliente + delivery + WhatsApp ───── */

function CheckoutSheet({
  open, onClose, local, cerrado, mensajeCerrado,
}: {
  open: boolean;
  onClose: () => void;
  local: Local;
  cerrado: boolean;
  mensajeCerrado?: string;
}) {
  const cart = useCart();
  const [nombre,         setNombre]         = useState('');
  const [telefono,       setTelefono]       = useState('');
  const [direccion,      setDireccion]      = useState('');
  const [clienteLat,     setClienteLat]     = useState<number | null>(null);
  const [clienteLng,     setClienteLng]     = useState<number | null>(null);
  const [fueraDeRango,   setFueraDeRango]   = useState(false);
  const [metodo,         setMetodo]         = useState<'pickup' | 'delivery'>('pickup');
  const [pago,           setPago]           = useState<'efectivo' | 'tarjeta_entrega' | 'transferencia'>(
    (local.metodosPago?.[0] ?? 'efectivo') as any,
  );
  const [sending,        setSending]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    setClienteLat(lat);
    setClienteLng(lng);
    if (local.lat && local.lng) {
      const dist = haversineKm(local.lat, local.lng, lat, lng);
      setFueraDeRango(dist > (local.delivery.radioKm ?? 5));
    }
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`)
      .then((r) => r.json())
      .then((d) => d.display_name && setDireccion(d.display_name))
      .catch(() => {});
  };

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      const payload = {
        cliente: {
          nombre,
          telefono,
          direccion: metodo === 'delivery' ? direccion : null,
          lat:       metodo === 'delivery' ? clienteLat : null,
          lng:       metodo === 'delivery' ? clienteLng : null,
        },
        metodo_entrega: metodo,
        metodo_pago:    pago,
        items: cart.items.map((i) => ({
          producto_id: i.productoId,
          cantidad:    i.cantidad,
          notas:       i.notas ?? null,
          extras:      i.extras,
        })),
      };
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/public/pedidos/${local.slug}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) },
      );
      if (res.status === 409) {
        const body = await res.json();
        const items = (body.faltantes ?? []).map((f: any) =>
          `${f.ingrediente} (faltan ${(f.requerido - f.disponible).toFixed(2)}${f.unidad})`,
        ).join(', ');
        setError(`Sin stock suficiente: ${items}. Quita algo del carrito o intenta más tarde.`);
        return;
      }
      if (res.status === 422) {
        const body = await res.json();
        setError(body.message ?? 'Datos incompletos.');
        return;
      }
      if (!res.ok) {
        const fallbackUrl = buildWhatsAppUrl(local, cart.items, {
          cliente: { nombre, telefono, direccion },
          metodoEntrega: metodo, metodoPago: pago,
        });
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        cart.clear();
        onClose();
        return;
      }
      const body = await res.json();
      const url  = body.whatsapp_url ?? buildWhatsAppUrl(local, cart.items, {
        cliente:       { nombre, telefono, direccion },
        metodoEntrega: metodo,
        metodoPago:    pago,
        folio:         body.data?.codigo,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
      cart.clear();
      onClose();
    } catch (e) {
      const url = buildWhatsAppUrl(local, cart.items, {
        cliente: { nombre, telefono, direccion },
        metodoEntrega: metodo, metodoPago: pago,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
      cart.clear();
      onClose();
    } finally {
      setSending(false);
    }
  };

  const fee   = metodo === 'delivery' ? local.delivery.fee : 0;
  const total = cart.subtotal() + fee;

  const inputCls =
    'w-full h-12 px-4 rounded-2xl border-2 text-base bg-surface focus:outline-none transition-all';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(20,12,6,.5)' }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="w-full sm:max-w-[560px] bg-surface rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-auto scroll-fine pb-safe"
            style={{ background: '#FBF8F3' }}
          >
            <div className="px-5 sm:px-7 pt-5 pb-8">
              <div className="sm:hidden flex justify-center mb-2"><span className="w-10 h-1.5 rounded-full bg-line" /></div>
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Volver"
                  className="w-11 h-11 rounded-full border border-line bg-surface grid place-items-center shrink-0 hover:-translate-x-0.5 transition-transform"
                >
                  <Icon name="arrow-right" size={16} className="rotate-180" />
                </button>
                <div>
                  <div
                    className="text-[11px] font-bold uppercase mb-0.5"
                    style={{ color: 'var(--ce-accent)', letterSpacing: '0.2em' }}
                  >
                    Último paso
                  </div>
                  <h2 className="ce-serif text-3xl m-0 leading-none">Confirma tu pedido</h2>
                </div>
              </div>

              {/* Resumen */}
              <div
                className="bg-surface border border-line rounded-3xl px-5 py-4 mb-5"
                style={{ boxShadow: '0 10px 30px -12px rgba(35,25,15,.18)' }}
              >
                <div
                  className="text-[11px] font-bold uppercase mb-3"
                  style={{ color: 'var(--ce-muted)', letterSpacing: '0.18em' }}
                >
                  Resumen
                </div>
                {cart.items.map((i) => (
                  <div key={i.lineKey} className="flex justify-between gap-3 py-1.5 text-sm">
                    <span>
                      <span className="font-extrabold" style={{ color: 'var(--ce-accent)' }}>{i.cantidad}×</span>{' '}
                      {i.nombre}
                    </span>
                    <span className="font-bold whitespace-nowrap tabular-nums">{formatMXN(i.precio * i.cantidad)}</span>
                  </div>
                ))}
                {fee > 0 && (
                  <div className="flex justify-between gap-3 py-1.5 text-sm">
                    <span>Envío</span>
                    <span className="font-bold tabular-nums">{formatMXN(fee)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 pt-3.5 border-t border-line">
                  <span className="text-[15px] font-bold" style={{ color: 'var(--ce-muted)' }}>Total</span>
                  <span className="text-2xl font-extrabold tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                    {formatMXN(total)}
                  </span>
                </div>
              </div>

              {/* Form */}
              <div className="flex flex-col gap-3.5 mb-5">
                <div>
                  <label className="block text-[12.5px] font-bold mb-1.5" style={{ color: 'var(--ce-muted)' }}>
                    Tu nombre
                  </label>
                  <input
                    className={inputCls}
                    style={{ borderColor: 'rgba(35,25,15,0.08)' }}
                    placeholder="¿A nombre de quién?"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold mb-1.5" style={{ color: 'var(--ce-muted)' }}>
                    Tipo de entrega
                  </label>
                  <div className="flex gap-2 rounded-2xl p-1.5 border border-line" style={{ background: '#FBF7F1' }}>
                    {(['delivery', 'pickup'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodo(m)}
                        className={cn(
                          'flex-1 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 transition-all',
                          metodo === m ? 'text-white shadow-md' : '',
                        )}
                        style={metodo === m ? {
                          background: 'linear-gradient(135deg, var(--ce-accent), color-mix(in srgb, var(--ce-accent) 72%, black))',
                        } : undefined}
                      >
                        <Icon name={m === 'pickup' ? 'storefront' : 'truck'} size={14} />
                        {m === 'pickup' ? 'Recoger' : 'A domicilio'}
                      </button>
                    ))}
                  </div>
                </div>

                {metodo === 'delivery' && (
                  <div className="space-y-2">
                    <label className="block text-[12.5px] font-bold" style={{ color: 'var(--ce-muted)' }}>
                      Dirección de entrega
                    </label>
                    <DeliveryAddressInput
                      direccion={direccion}
                      onDireccionChange={setDireccion}
                      onMapClick={handleMapClick}
                      lat={clienteLat}
                      lng={clienteLng}
                      localLat={local.lat ?? null}
                      localLng={local.lng ?? null}
                    />
                    {fueraDeRango && (
                      <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 inline-flex items-start gap-2">
                        <Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />
                        <span>Fuera de zona de entrega ({local.delivery.radioKm} km). Elige otra ubicación.</span>
                      </div>
                    )}
                    {clienteLat && clienteLng && !fueraDeRango && local.lat && local.lng && (
                      <p className="text-xs text-green-700 inline-flex items-center gap-1.5">
                        <Icon name="check-circle" size={13} />
                        Dentro del área ({haversineKm(local.lat, local.lng, clienteLat, clienteLng).toFixed(1)} km)
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[12.5px] font-bold mb-1.5" style={{ color: 'var(--ce-muted)' }}>
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className={inputCls}
                    style={{ borderColor: 'rgba(35,25,15,0.08)' }}
                    placeholder="Para confirmar tu pedido"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    autoComplete="tel"
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-bold mb-1.5" style={{ color: 'var(--ce-muted)' }}>
                    Método de pago
                  </label>
                  <select
                    className={inputCls}
                    style={{ borderColor: 'rgba(35,25,15,0.08)' }}
                    value={pago}
                    onChange={(e) => setPago(e.target.value as any)}
                  >
                    {(local.metodosPago ?? ['efectivo', 'tarjeta_entrega', 'transferencia']).map((m) => (
                      <option key={m} value={m}>
                        {m === 'efectivo' ? 'Efectivo' : m === 'tarjeta_entrega' ? 'Tarjeta a la entrega' : 'Transferencia / SPEI'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {cerrado && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                  <Icon name="alert-triangle" size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <strong className="block">Local cerrado</strong>
                    <span className="text-xs">{mensajeCerrado ?? 'No estamos aceptando pedidos en este momento.'}</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={sending || cerrado || !nombre || !telefono || (metodo === 'delivery' && (!direccion || fueraDeRango))}
                className="w-full h-[58px] rounded-3xl text-white ce-body font-extrabold text-base inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed tap-target"
                style={{
                  background: '#25D366',
                  boxShadow: '0 14px 32px -10px rgba(37,211,102,.55)',
                }}
              >
                <Icon name="whatsapp" size={20} />
                {sending ? 'Enviando…' : cerrado ? 'Cerrado · no se puede enviar' : 'Enviar pedido por WhatsApp'}
              </button>
              <p className="text-center text-xs mt-3.5" style={{ color: 'var(--ce-muted)' }}>
                Se abrirá WhatsApp con tu pedido listo para enviar.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───── DeliveryAddressInput (mantenido) ───── */

interface NominatimResult { display_name: string; lat: string; lon: string; }

function DeliveryAddressInput({
  direccion, onDireccionChange, onMapClick, lat, lng, localLat, localLng,
}: {
  direccion: string;
  onDireccionChange: (v: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  lat: number | null;
  lng: number | null;
  localLat: number | null;
  localLng: number | null;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    onDireccionChange(q);
    if (debounceRef[0]) clearTimeout(debounceRef[0]);
    if (q.length < 3) { setSuggestions([]); return; }
    debounceRef[1](setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=es`);
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch { /* ignore */ }
    }, 400) as any);
  };

  const pick = (item: NominatimResult) => {
    onDireccionChange(item.display_name);
    setSuggestions([]);
    setOpen(false);
    onMapClick(parseFloat(item.lat), parseFloat(item.lon));
  };

  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { onMapClick(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={direccion}
          onChange={(e) => search(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Calle, número, colonia y referencias"
          className="w-full h-12 px-4 rounded-2xl border-2 text-base bg-surface focus:outline-none"
          style={{ borderColor: 'rgba(35,25,15,0.08)' }}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <li key={i} onMouseDown={() => pick(s)} className="px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 border-b border-line last:border-0">
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-line text-sm text-muted hover:bg-line/30 disabled:opacity-50"
      >
        {locating ? (
          <><Icon name="compass" size={14} className="animate-spin" /> Obteniendo ubicación…</>
        ) : (
          <><Icon name="navigation" size={14} /> Usar mi ubicación aproximada</>
        )}
      </button>
      <p className="text-xs" style={{ color: 'var(--ce-muted)' }}>
        Ajusta el punto en el mapa para mayor precisión.
      </p>
      <div className="h-48 rounded-2xl overflow-hidden border border-line">
        <LeafletMap
          lat={lat}
          lng={lng}
          onMapClick={onMapClick}
          initialCenter={localLat && localLng ? { lat: localLat, lng: localLng } : undefined}
        />
      </div>
    </div>
  );
}

/* ───── Footer — dark restaurante premium con LUMIA ───── */

function Footer({ local, branding }: { local: Local; branding: Branding }) {
  const hasRedes = !!local.redes && Object.keys(local.redes).some((k) => local.redes![k]);
  return (
    <footer className="relative text-white mt-5 overflow-hidden" style={{ background: '#211A13' }}>
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: 'linear-gradient(90deg, transparent 0%, var(--ce-accent) 50%, transparent 100%)' }}
      />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-20">
        <div
          className="hero-orb"
          style={{ background: 'var(--ce-accent)', width: 480, height: 480, top: -200, right: -120 }}
        />
      </div>
      <div className="relative max-w-[1140px] mx-auto px-5 sm:px-10 py-12 sm:py-16 pb-7">
        <div className="flex flex-wrap gap-y-9 gap-x-12 justify-between">
          {/* Identidad */}
          <div className="max-w-[300px]">
            <div className="flex items-center gap-3 mb-3">
              {branding.logo && (
                <img src={branding.logo} alt={local.nombre} className="w-11 h-11 rounded-xl object-cover bg-white border-2 border-white/20" />
              )}
              <p className="ce-serif text-[30px] leading-none m-0">{local.nombre}</p>
            </div>
            {local.tagline && (
              <p className="text-[13.5px] leading-relaxed m-0 text-white/60">{local.tagline}</p>
            )}
          </div>

          {/* Contacto */}
          <div>
            <div
              className="text-[11px] font-bold uppercase mb-3.5"
              style={{ color: 'var(--ce-accent)', letterSpacing: '0.2em' }}
            >
              Contacto
            </div>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-white/80">
              {local.direccion && (
                <span className="inline-flex items-center gap-2.5">
                  <Icon name="map-pin" size={14} className="text-white/50 shrink-0" />
                  {local.direccion}
                </span>
              )}
              {(local.telefono || local.whatsapp) && (
                <span className="inline-flex items-center gap-2.5">
                  <Icon name="phone" size={14} className="text-white/50 shrink-0" />
                  {local.telefono || local.whatsapp}
                </span>
              )}
              <span className="inline-flex items-center gap-2.5">
                <Icon name="clock" size={14} className="text-white/50 shrink-0" />
                {formatHorarios(local.horarios)}
              </span>
            </div>
          </div>

          {/* Redes */}
          {hasRedes && (
            <div>
              <div
                className="text-[11px] font-bold uppercase mb-3.5"
                style={{ color: 'var(--ce-accent)', letterSpacing: '0.2em' }}
              >
                Síguenos
              </div>
              <div className="flex gap-2.5">
                {local.redes?.ig && (
                  <SocialPill
                    href={local.redes.ig.startsWith('http') ? local.redes.ig : `https://instagram.com/${local.redes.ig.replace(/^@/, '')}`}
                    label="Instagram"
                    icon="instagram"
                  />
                )}
                {local.redes?.fb && (
                  <SocialPill
                    href={local.redes.fb.startsWith('http') ? local.redes.fb : `https://facebook.com/${local.redes.fb}`}
                    label="Facebook"
                    icon="facebook"
                  />
                )}
                {local.whatsapp && (
                  <SocialPill
                    href={`https://wa.me/${local.whatsapp.replace(/\D/g, '')}`}
                    label="WhatsApp"
                    icon="whatsapp"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="h-px mt-8 mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(239,231,220,.16), transparent)' }} />
        <div className="flex flex-wrap gap-2 justify-between items-center text-xs text-white/50">
          <span>© {new Date().getFullYear()} {local.nombre}. Todos los derechos reservados.</span>
          <span>
            Desarrollado por{' '}
            <a
              href="https://lumiaaisolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold tracking-wide pb-[1px]"
              style={{ borderBottom: '1px solid var(--ce-accent)' }}
            >
              LUMIA
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialPill({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-[42px] h-[42px] rounded-full border border-white/20 grid place-items-center text-white transition-all duration-300 hover:-translate-y-[3px] hover:border-transparent"
      style={{ ['--hover-bg' as any]: 'var(--ce-accent)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--ce-accent)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
    >
      <Icon name={icon} size={16} />
    </a>
  );
}

/* ───── Helpers ───── */

const DIAS_ORDER: Record<string, number> = {
  lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 7,
};
const DIAS_LABEL: Record<string, string> = {
  lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue', vie: 'Vie', sab: 'Sáb', dom: 'Dom',
};

function formatHorarios(horarios: Local['horarios']): string {
  if (!horarios || horarios.length === 0) return 'Consultar';
  const sorted = [...horarios]
    .filter((h) => h.dia && h.open && h.close)
    .sort((a, b) => (DIAS_ORDER[a.dia.toLowerCase()] ?? 9) - (DIAS_ORDER[b.dia.toLowerCase()] ?? 9));
  if (sorted.length === 0) return 'Consultar';
  const firstOpen = sorted[0].open.slice(0, 5);
  const firstClose = sorted[0].close.slice(0, 5);
  const sameSchedule = sorted.every((h) => h.open.slice(0, 5) === firstOpen && h.close.slice(0, 5) === firstClose);
  if (sameSchedule && sorted.length === 7) {
    return `Lun – Dom · ${firstOpen} – ${firstClose}`;
  }
  if (sameSchedule) {
    const dias = sorted.map((h) => DIAS_LABEL[h.dia.toLowerCase()] ?? h.dia).join(', ');
    return `${dias} · ${firstOpen} – ${firstClose}`;
  }
  return `${DIAS_LABEL[sorted[0].dia.toLowerCase()] ?? sorted[0].dia} ${firstOpen}–${firstClose}…`;
}

/* Heurística para inferir icono desde el nombre cuando la categoría no tiene
   uno asignado en BD. El admin puede editar el icono desde /admin/categorias. */
function iconForCategoria(nombre: string): IconName {
  const n = nombre.toLowerCase();
  if (/(paleta|popsicle|chupachup)/.test(n)) return 'popsicle';
  if (/(helado|nieve|ice ?cream|sorbete|gelato)/.test(n)) return 'ice-cream';
  if (/(cherry|fresa|frut|berry|tropic)/.test(n) && /(postre|dulce)/.test(n)) return 'cherry';
  if (/(postre|pastel|cake|brownie|cookie|galleta|repost|donut|cup ?cake|tart)/.test(n)) return 'cake';
  if (/(manzana|apple|fruta(?!l)|fruit)/.test(n)) return 'apple';
  if (/(vino|wine)/.test(n)) return 'wine';
  if (/(coctel|cóctel|cocktail|martini|mezcal|tequila|whisky|trago)/.test(n)) return 'martini-glass';
  if (/(cerveza|beer|cheve|chela)/.test(n)) return 'beer';
  if (/(refresco|soda|coke|cola|pepsi|sprite|fanta)/.test(n)) return 'cup-soda';
  if (/(leche|milk|malteada|batido|smoothie|frapp|frappe)/.test(n)) return 'milk';
  if (/(café|cafe|coffee|capuchino|latte|mocha|chocolate|té|tea|infusi)/.test(n)) return 'coffee';
  if (/(bebida|agua|jugo|drink)/.test(n)) return 'cup-soda';
  if (/(pizza)/.test(n)) return 'pizza';
  if (/(hamburguesa|burger|sandwich|hot ?dog|pita|wrap|sub)/.test(n)) return 'sandwich';
  if (/(sopa|caldo|soup|crema|consomé|consome|pozole|menudo)/.test(n)) return 'soup';
  if (/(carne|steak|bisteck|res|cecina|asada|arrachera|costilla|ribs|beef|cordero|cerdo)/.test(n)) return 'beef';
  if (/(pollo|alit|chicken|pavo|nugget)/.test(n)) return 'drumstick';
  if (/(pescado|fish|marisco|camaron|camarón|atún|atun|salmon|salmón|ceviche|tilapia)/.test(n)) return 'fish';
  if (/(huevo|egg|omelette|chilaquil|desayun)/.test(n)) return 'egg';
  if (/(pan|bread|croissant|panaderia|panadería|bagel|baguette|bollo|concha)/.test(n)) return 'croissant';
  if (/(palomita|popcorn|snack|botana|chips|fritura)/.test(n)) return 'popcorn';
  if (/(taco|burrito|quesadilla|enchilada|tortilla|mexican|antojito|gordita|sope|tlayuda|tamal)/.test(n)) return 'utensils';
  if (/(ensalad|salad|verde fresco)/.test(n)) return 'salad';
  if (/(vegan|plant|plant ?based)/.test(n)) return 'sprout';
  if (/(sin ?gluten|gluten ?free|integral|cereal|grano)/.test(n)) return 'wheat';
  if (/(picante|spicy|hot|flam|parrilla|grill)/.test(n)) return 'flame';
  if (/(desayun|breakfast|brunch|matutino|mañana|maniana)/.test(n)) return 'sun';
  if (/(cena|dinner|nocturno|noche|night)/.test(n)) return 'moon';
  if (/(combo|paquete|pack|menú del día|menu del dia|familiar|family|para compartir)/.test(n)) return 'gift';
  if (/(saludab|sano|fit|light|low cal)/.test(n)) return 'salad';
  if (/(promo|oferta|deal|descuento)/.test(n)) return 'sparkles';
  if (/(destacad|popular|recomendad|favorito|chef|signature|especial)/.test(n)) return 'star-filled';
  return 'utensils';
}
