'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCart } from '@/store/cart';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { cn, formatMXN } from '@/lib/utils';
import type { MenuResponse } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import 'leaflet/dist/leaflet.css';

const LeafletMap = dynamic(() => import('@/components/admin/LeafletMap'), { ssr: false, loading: () => <div className="h-48 rounded-xl border border-line bg-line/30 animate-pulse" /> });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
  menu: MenuResponse['data'];
}

export function LandingClient({ menu }: Props) {
  const { local, branding, categorias, productos } = menu;
  const cart = useCart();

  // Estado de apertura calculado server-side. Si está cerrado (false), bloquear
  // todas las acciones de compra. Si es null (sin horario), permitir.
  const estado     = (local as any).estado as { abierto: boolean | null; mensaje: string } | undefined;
  const cerrado    = estado?.abierto === false;

  const [activeCat, setActiveCat] = useState(categorias[0]?.slug ?? null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // El carrito vive en localStorage (Zustand persist). En SSR está vacío y al
  // hidratar lee localStorage → si tiene items, el HTML del cliente difiere
  // del server (hydration error). Marcamos `mounted` y SOLO leemos el carrito
  // después de la hidratación.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Cuando entras a un slug distinto al carrito anterior, se purga
  useEffect(() => {
    cart.setLocal(local.slug);
  }, [local.slug]);

  const productosFiltrados = useMemo(
    () =>
      activeCat
        ? productos.filter((p) => p.categoria.slug === activeCat)
        : productos,
    [activeCat, productos],
  );

  // Después de hidratar leemos el carrito; antes mostramos vacío (igual que SSR).
  const itemCount = mounted ? cart.itemCount() : 0;
  const subtotal  = mounted ? cart.subtotal()  : 0;

  return (
    <div
      className={cn('min-h-screen pb-32', branding.darkMode && 'ce-dark')}
      style={{
        ['--ce-accent' as any]: branding.colorPrimario,
        background: branding.darkMode ? 'var(--ce-bg)' : (branding.colorFondo || 'var(--ce-bg)'),
        color: 'var(--ce-ink)',
      }}
    >
      {/* HERO */}
      <header className="relative h-64 sm:h-80 md:h-[28rem] overflow-hidden">
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
        {/* Gradient overlay con dos capas para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />

        <div className="relative z-10 h-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col justify-end pb-6 sm:pb-10 text-white">
          {branding.logo && (
            <motion.img
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              src={branding.logo}
              alt={local.nombre}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-white border-[3px] border-white shadow-xl mb-4"
            />
          )}
          {/* Pill de estado con halo pulse */}
          {(local as any).estado && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mb-3 inline-flex items-center gap-1.5 self-start"
            >
              <span className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm',
                (local as any).estado.abierto === true  ? 'bg-emerald-500/95 text-white'
                : (local as any).estado.abierto === false ? 'bg-red-500/95 text-white'
                : 'bg-white/30 text-white',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full bg-white',
                  (local as any).estado.abierto === true && 'halo-pulse',
                )} />
                {(local as any).estado.abierto === true ? 'Abierto'
                 : (local as any).estado.abierto === false ? 'Cerrado'
                 : 'Horario no disponible'}
              </span>
              {(local as any).estado.mensaje && (local as any).estado.abierto !== null && (
                <span className="hidden xs:inline text-xs opacity-90">
                  · {(local as any).estado.mensaje.replace(/^(Abierto|Cerrado)\s*[·.]?\s*/, '')}
                </span>
              )}
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="ce-display text-4xl sm:text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight"
          >
            {local.nombre}
          </motion.h1>
          {local.tagline && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-2 sm:mt-3 max-w-xl opacity-90 text-sm sm:text-base"
            >
              {local.tagline}
            </motion.p>
          )}
          {local.direccion && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.42 }}
              className="mt-3 sm:mt-4 text-xs sm:text-sm opacity-85 inline-flex items-center gap-1.5"
            >
              <Icon name="map-pin" size={13} />
              {local.direccion}
            </motion.p>
          )}
        </div>
      </header>

      {/* BANNER DE CERRADO — estilo restaurante premium: barra accent vertical
          a la izquierda + icon reloj con halo pulse + tipografía display +
          badge "CERRADO" a la derecha con pulse blanco. */}
      {cerrado && (() => {
        // El mensaje del backend puede venir como "Cerrado · abre hoy a las 17:30".
        // Limpiar el prefijo redundante.
        const mensajeLimpio = (estado?.mensaje as string | undefined)
          ?.replace(/^(Abierto|Cerrado)\s*[·.,-]?\s*/i, '')
          ?.trim() || 'Vuelve más tarde.';
        return (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative bg-white border-b border-line shadow-soft overflow-hidden"
          >
            {/* Barra accent vertical roja a la izquierda — sello de restaurante */}
            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600" />

            <div className="max-w-5xl mx-auto px-5 sm:px-7 py-4 sm:py-5 flex items-center gap-4">
              {/* Icon reloj con halo pulse (ring expandiéndose) */}
              <span className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-50 border border-red-200 grid place-items-center text-red-600">
                <span aria-hidden className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
                <Icon name="clock" size={20} className="relative" />
              </span>

              {/* Texto principal con jerarquía editorial */}
              <div className="flex-1 min-w-0">
                <p className="ce-display text-base sm:text-lg font-bold text-ink leading-tight tracking-tight">
                  Volvemos pronto
                </p>
                <p className="text-xs sm:text-sm text-muted mt-0.5 leading-relaxed">
                  {mensajeLimpio}
                </p>
              </div>

              {/* Badge CERRADO derecha (oculto en mobile estrecho) */}
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white halo-pulse" />
                Cerrado
              </span>
            </div>
          </motion.div>
        );
      })()}

      {/* CATEGORÍAS — chips horizontales con snap */}
      <nav className="sticky top-0 z-30 glass border-b border-line">
        <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex gap-2 overflow-x-auto scroll-x-snap no-scrollbar">
          {categorias.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCat(c.slug)}
              className={cn(
                'px-3 sm:px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border shrink-0 tap-target',
                activeCat === c.slug
                  ? 'text-white border-transparent'
                  : 'bg-surface border-line hover:border-ink/40',
              )}
              style={activeCat === c.slug ? { background: 'var(--ce-accent)' } : undefined}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </nav>

      {/* PRODUCTOS — Accordion expansible (horizontal en md+, vertical en mobile) */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <ProductAccordion
          productos={productosFiltrados}
          cerrado={cerrado}
          onAdd={(producto, qty) => {
            cart.add({
              productoId: producto.id,
              nombre: producto.nombre,
              precio: producto.precio,
              imagen: producto.imagen,
              extras: [],
              lineKey: `${producto.id}`,
              cantidad: qty,
            });
            setCartOpen(true);
          }}
        />
      </section>

      {/* FOOTER INFO — card de estado + redes sociales prominentes */}
      <footer className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        {/* Status card grande con icono + texto */}
        {(local as any).estado && (local as any).estado.abierto !== null && (() => {
          const est = (local as any).estado;
          // El mensaje del backend a veces viene como "Cerrado · abre mañana a las 17:30".
          // Limpiamos el prefijo redundante del estado.
          const mensajeLimpio = (est.mensaje as string)
            .replace(/^(Abierto|Cerrado)\s*[·.,-]?\s*/i, '')
            .trim();
          const isOpen = est.abierto === true;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className={cn(
                'rounded-3xl border p-5 sm:p-6 flex items-start gap-4',
                isOpen
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50',
              )}
            >
              <span className={cn(
                'shrink-0 w-12 h-12 rounded-2xl grid place-items-center text-white shadow-sm',
                isOpen ? 'bg-emerald-500' : 'bg-red-500',
              )}>
                <Icon name={isOpen ? 'check-circle' : 'clock'} size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="ce-display text-xl sm:text-2xl font-bold leading-tight">
                    {isOpen ? 'Abierto ahora' : 'Cerrado por ahora'}
                  </h3>
                  {isOpen && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 halo-pulse" />
                      En línea
                    </span>
                  )}
                </div>
                {mensajeLimpio && (
                  <p className={cn(
                    'mt-1 text-sm sm:text-base',
                    isOpen ? 'text-emerald-900/80' : 'text-red-900/80',
                  )}>
                    {mensajeLimpio}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* Redes sociales con título grande */}
        {local.redes && Object.keys(local.redes).some((k) => local.redes![k]) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
              <span className="w-6 h-px bg-ink/40" />
              Síguenos
            </p>
            <h3 className="ce-display mt-2 text-2xl sm:text-3xl font-bold leading-tight">
              También estamos en redes
            </h3>
            <ul className="mt-8 flex flex-wrap items-start gap-6 sm:gap-10 list-none pl-0">
              {local.redes.fb && (
                <li>
                  <SocialCard3D
                    href={local.redes.fb.startsWith('http') ? local.redes.fb : `https://facebook.com/${local.redes.fb}`}
                    label="Facebook"
                    icon="facebook"
                    brand="#1877f2"
                    brandDark="#0e58b8"
                    brandLight="#4287e0"
                  />
                </li>
              )}
              {local.redes.ig && (
                <li>
                  <SocialCard3D
                    href={local.redes.ig.startsWith('http') ? local.redes.ig : `https://instagram.com/${local.redes.ig.replace(/^@/, '')}`}
                    label="Instagram"
                    icon="instagram"
                    /* Gradient real de Instagram aplicado vía CSS var */
                    brand="linear-gradient(135deg, #f9a825 0%, #e91e8c 50%, #9c27b0 100%)"
                    brandDark="#a5215c"
                    brandLight="#d34583"
                  />
                </li>
              )}
              {local.redes.tt && (
                <li>
                  <SocialCard3D
                    href={local.redes.tt.startsWith('http') ? local.redes.tt : `https://tiktok.com/@${local.redes.tt.replace(/^@/, '')}`}
                    label="TikTok"
                    icon="sparkles"
                    brand="#000000"
                    brandDark="#222222"
                    brandLight="#444444"
                  />
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </footer>

      {/* FLOATING WHATSAPP / CART */}
      <FloatingCartBar
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

function FloatingCartBar({
  count, subtotal, cerrado, onClick,
}: { count: number; subtotal: number; cerrado: boolean; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-3 inset-x-3 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:w-80 pb-safe"
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl text-white shadow-glass font-medium text-sm sm:text-base tap-target',
          cerrado && 'bg-gray-500',
        )}
        style={cerrado ? undefined : { background: 'var(--ce-accent)' }}
      >
        <span className="inline-flex items-center gap-2">
          {cerrado ? (
            <>
              <Icon name="alert-triangle" size={16} />
              Cerrado
            </>
          ) : (
            <>
              <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-xs font-bold">{count}</span>
              {count === 1 ? 'producto' : 'productos'}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {formatMXN(subtotal)}
          {!cerrado && <Icon name="arrow-right" size={14} />}
        </span>
      </button>
    </motion.div>
  );
}

function CartDrawer({
  open, cerrado, onClose, onCheckout,
}: { open: boolean; cerrado: boolean; onClose: () => void; onCheckout: () => void }) {
  const cart = useCart();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button aria-label="Cerrar" onClick={onClose} className="flex-1 bg-black/50" />
      <motion.aside
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        className="w-full max-w-md bg-surface h-full flex flex-col shadow-glass"
      >
        <header className="px-4 sm:px-5 py-3 sm:py-4 border-b border-line flex items-center justify-between">
          <h3 className="ce-display font-bold text-lg sm:text-xl">Tu pedido</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 rounded-xl hover:bg-line/50 grid place-items-center tap-target"
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <ul className="flex-1 overflow-auto divide-y divide-line scroll-fine">
          {cart.items.length === 0 ? (
            <li className="p-10 text-center text-muted text-sm">Carrito vacío</li>
          ) : cart.items.map((i) => (
            <li key={i.lineKey} className="p-3 sm:p-4 flex gap-3">
              {i.imagen && <img src={i.imagen} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm sm:text-base truncate">{i.nombre}</div>
                <div className="text-xs sm:text-sm text-muted">{formatMXN(i.precio)}</div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  onClick={() => cart.setQty(i.lineKey, i.cantidad - 1)}
                  aria-label="Restar"
                  className="w-9 h-9 rounded-full border border-line tap-target grid place-items-center hover:bg-line/40"
                >
                  <Icon name="minus" size={14} />
                </button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{i.cantidad}</span>
                <button
                  onClick={() => cart.setQty(i.lineKey, i.cantidad + 1)}
                  aria-label="Sumar"
                  className="w-9 h-9 rounded-full border border-line tap-target grid place-items-center hover:bg-line/40"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <footer className="p-4 sm:p-5 border-t border-line pb-safe">
          <div className="flex justify-between mb-3 text-sm sm:text-base">
            <span>Subtotal</span>
            <span className="font-bold">{formatMXN(cart.subtotal())}</span>
          </div>
          {cerrado && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              🔒 El local está cerrado. No puedes finalizar el pedido en este momento.
            </div>
          )}
          <button
            onClick={onCheckout}
            disabled={cart.itemCount() === 0 || cerrado}
            className={cn(
              'w-full py-3 sm:py-3.5 rounded-2xl text-white font-medium disabled:opacity-40 tap-target text-base',
              cerrado && 'bg-gray-400',
            )}
            style={cerrado ? undefined : { background: 'var(--ce-accent)' }}
          >
            {cerrado ? 'Cerrado' : 'Continuar'}
          </button>
        </footer>
      </motion.aside>
    </div>
  );
}

function CheckoutSheet({
  open, onClose, local, cerrado, mensajeCerrado,
}: {
  open: boolean;
  onClose: () => void;
  local: MenuResponse['data']['local'];
  cerrado: boolean;
  mensajeCerrado?: string;
}) {
  const cart = useCart();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [clienteLat, setClienteLat] = useState<number | null>(null);
  const [clienteLng, setClienteLng] = useState<number | null>(null);
  const [fueraDeRango, setFueraDeRango] = useState(false);
  const [metodo, setMetodo] = useState<'pickup' | 'delivery'>('pickup');
  const [pago, setPago] = useState<'efectivo' | 'tarjeta_entrega' | 'transferencia'>(
    (local.metodosPago?.[0] ?? 'efectivo') as any,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    setClienteLat(lat);
    setClienteLng(lng);
    // Validar radio si el local tiene ubicación configurada
    if (local.lat && local.lng) {
      const dist = haversineKm(local.lat, local.lng, lat, lng);
      setFueraDeRango(dist > (local.delivery.radioKm ?? 5));
    }
    // Reverse geocode
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`)
      .then((r) => r.json())
      .then((d) => d.display_name && setDireccion(d.display_name))
      .catch(() => {});
  };

  if (!open) return null;

  const handleSend = async () => {
    setError(null);
    setSending(true);
    try {
      const payload = {
        cliente:        { nombre, telefono, direccion: metodo === 'delivery' ? direccion : null, lat: metodo === 'delivery' ? clienteLat : null, lng: metodo === 'delivery' ? clienteLng : null },
        metodo_entrega: metodo,
        metodo_pago:    pago,
        items: cart.items.map((i) => ({
          producto_id: i.productoId,
          cantidad:    i.cantidad,
          notas:       i.notas ?? null,
          extras:      i.extras,
        })),
      };

      // 1) Persistir el pedido (descuenta inventario en el server)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'}/public/pedidos/${local.slug}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body:    JSON.stringify(payload),
        },
      );

      if (res.status === 409) {
        const body = await res.json();
        const items = (body.faltantes ?? []).map((f: any) =>
          `${f.ingrediente} (faltan ${(f.requerido - f.disponible).toFixed(2)}${f.unidad})`
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
        // Fallback: usa el builder local para no bloquear al cliente
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
      const url  = body.whatsapp_url
        ?? buildWhatsAppUrl(local, cart.items, {
              cliente: { nombre, telefono, direccion },
              metodoEntrega: metodo, metodoPago: pago,
              folio: body.data?.codigo,
            });

      window.open(url, '_blank', 'noopener,noreferrer');
      cart.clear();
      onClose();
    } catch (e) {
      // Sin red: fallback al builder local — al menos abre WhatsApp
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

  const fee = metodo === 'delivery' ? local.delivery.fee : 0;
  const total = cart.subtotal() + fee;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className="w-full md:max-w-md bg-surface rounded-t-3xl md:rounded-3xl p-4 sm:p-6 max-h-[92vh] overflow-auto pb-safe scroll-fine"
      >
        <div className="md:hidden flex justify-center -mt-2 mb-2">
          <span className="block w-10 h-1.5 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="ce-display font-bold text-lg sm:text-xl">Tus datos</h3>
          <button onClick={onClose} aria-label="Cerrar" className="tap-target rounded-xl hover:bg-line/50 grid place-items-center">✕</button>
        </div>

        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input
          className="w-full mb-3 px-3 py-2.5 border border-line rounded-xl text-base min-h-[44px]"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
        />

        <label className="block text-sm font-medium mb-1">Teléfono</label>
        <input
          type="tel"
          className="w-full mb-3 px-3 py-2.5 border border-line rounded-xl text-base min-h-[44px]"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
          inputMode="numeric"
        />

        <div className="flex gap-2 mb-3">
          {(['pickup', 'delivery'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetodo(m)}
              className={cn('flex-1 py-3 rounded-xl border font-medium tap-target',
                metodo === m ? 'text-white border-transparent' : 'border-line bg-surface')}
              style={metodo === m ? { background: 'var(--ce-accent)' } : undefined}
            >
              {m === 'pickup' ? '🏪 Recoger' : '🛵 Entrega'}
            </button>
          ))}
        </div>

        {metodo === 'delivery' && (
          <div className="mb-3 space-y-2">
            <label className="block text-sm font-medium">Dirección de entrega</label>
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
                <span>Esta dirección está fuera de nuestra zona de entrega ({local.delivery.radioKm} km). Por favor elige otra ubicación.</span>
              </div>
            )}
            {clienteLat && clienteLng && !fueraDeRango && local.lat && local.lng && (
              <p className="text-xs text-green-700 inline-flex items-center gap-1.5">
                <Icon name="check-circle" size={13} />
                Dentro del área de entrega ({haversineKm(local.lat, local.lng, clienteLat, clienteLng).toFixed(1)} km)
              </p>
            )}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Pago</label>
        <select
          className="w-full mb-4 px-3 py-2.5 border border-line rounded-xl text-base min-h-[44px]"
          value={pago}
          onChange={(e) => setPago(e.target.value as any)}
        >
          {(local.metodosPago ?? ['efectivo', 'tarjeta_entrega', 'transferencia']).map((m) => (
            <option key={m} value={m}>
              {m === 'efectivo' ? '💵 Efectivo' : m === 'tarjeta_entrega' ? '💳 Tarjeta a la entrega' : '📲 Transferencia / SPEI'}
            </option>
          ))}
        </select>

        <div className="rounded-xl bg-line/20 p-3 mb-4">
          <div className="flex justify-between mb-1 text-sm"><span>Subtotal</span><span className="font-mono">{formatMXN(cart.subtotal())}</span></div>
          {fee > 0 && <div className="flex justify-between mb-1 text-sm"><span>Envío</span><span className="font-mono">{formatMXN(fee)}</span></div>}
          <div className="flex justify-between font-bold pt-1 border-t border-line"><span>Total</span><span className="font-mono">{formatMXN(total)}</span></div>
        </div>

        {cerrado && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <span>🔒</span>
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
          onClick={handleSend}
          disabled={sending || cerrado || !nombre || !telefono || (metodo === 'delivery' && (!direccion || fueraDeRango))}
          className={cn(
            'w-full py-3 rounded-2xl text-white font-medium disabled:opacity-40',
            cerrado && 'bg-gray-400',
          )}
          style={cerrado ? undefined : { background: '#25D366' }}
        >
          {cerrado ? 'Cerrado · no se puede enviar' : sending ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
        </button>
      </motion.div>
    </div>
  );
}

interface NominatimResult { display_name: string; lat: string; lon: string; }

function DeliveryAddressInput({ direccion, onDireccionChange, onMapClick, lat, lng, localLat, localLng }: {
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
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onMapClick(latitude, longitude);
        setLocating(false);
      },
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
          placeholder="Coloca tu dirección completa..."
          className="w-full px-3 py-2.5 border border-line rounded-xl text-base min-h-[44px] bg-surface pr-10"
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
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-line text-sm text-muted hover:bg-line/30 disabled:opacity-50"
      >
        {locating ? (
          <>
            <Icon name="compass" size={14} className="animate-spin" />
            Obteniendo ubicación…
          </>
        ) : (
          <>
            <Icon name="navigation" size={14} />
            Usar mi ubicación aproximada
          </>
        )}
      </button>
      <p className="text-xs text-muted">Ajusta el punto en el mapa para mayor precisión.</p>
      <div className="h-48 rounded-xl overflow-hidden border border-line">
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

/* ───── Social Card 3D — tarjetas isométricas inclinadas con lados 3D ─────
 *
 * CSS principal en globals.css (.social-3d). Aquí solo pasamos las CSS vars
 * con los colores específicos de cada red (background hover + lado izq + lado inf).
 * El gradient de Instagram se aplica también vía CSS var (background acepta
 * tanto colores sólidos como gradients).
 */

function SocialCard3D({
  href, label, icon, brand, brandDark, brandLight,
}: {
  href: string;
  label: string;
  icon: 'instagram' | 'facebook' | 'sparkles';
  brand: string;
  brandDark: string;
  brandLight: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="social-3d"
      style={{
        ['--brand' as string]: brand,
        ['--brand-dark' as string]: brandDark,
        ['--brand-light' as string]: brandLight,
      }}
    >
      <Icon name={icon} size={22} />
      {label}
    </a>
  );
}

/* ───── Product Preview (bottom sheet con selector de cantidad) ───── */

type Producto = MenuResponse['data']['productos'][number];

/* ───── Product Accordion (panels que se expanden al click) ─────
 *
 * Inspirado en el patrón clásico de Brad Traversy:
 * - Estado inicial: todos los paneles con flex: 0.5 (compactos)
 * - Click en un panel → ese pasa a flex: 5 (expandido), los otros vuelven a 0.5
 * - El expandido muestra título grande, descripción, selector +/- y "Agregar"
 * - Los compactos muestran solo el título vertical (rotado -90°) + precio sutil
 *
 * Responsive:
 * - md+: flex-row horizontal (accordion lateral)
 * - <md: flex-col vertical (acordeón apilado, el activo crece en altura)
 *
 * El panel activo NO requiere modal aparte — todo se hace inline. Más
 * rápido (1 tap para ver detalle + agregar) y más mobile-friendly.
 */
/**
 * Calcula cuántos productos caben por fila según el viewport.
 * Render inicial = 4 (PC) para evitar hydration mismatch — el `useEffect`
 * ajusta al breakpoint real en el primer paint.
 */
function useColsPerRow(): number {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w >= 1024) setCols(4);       // lg+
      else if (w >= 640) setCols(3);   // sm — tablet
      else setCols(2);                  // <sm — mobile
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return cols;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function ProductAccordion({
  productos, cerrado, onAdd,
}: {
  productos: Producto[];
  cerrado: boolean;
  onAdd: (producto: Producto, qty: number) => void;
}) {
  // Ningún panel activo por default — el usuario decide cuál abrir.
  const [activeId, setActiveId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const cols = useColsPerRow();

  // Reset cantidad al cambiar de panel.
  useEffect(() => { setQty(1); }, [activeId]);

  // Si cambia la categoría y el activeId apunta a un producto que ya no
  // existe en la lista nueva, colapsar todo.
  useEffect(() => {
    if (activeId != null && !productos.some((p) => p.id === activeId)) {
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos]);

  if (productos.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center text-muted text-sm">
        No hay productos en esta categoría.
      </div>
    );
  }

  // Chunk de productos en filas de `cols`. Cada fila es un accordion
  // independiente visualmente, pero comparten el mismo activeId (solo
  // uno expandido en todo el sistema).
  const rows = chunk(productos, cols);

  return (
    <div className="space-y-3 sm:space-y-4">
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-2 sm:gap-3 h-[420px] sm:h-[480px]"
        >
          {row.map((p) => (
            <AccordionPanel
              key={p.id}
              producto={p}
              active={activeId === p.id}
              cerrado={cerrado}
              qty={qty}
              onActivate={() => setActiveId(activeId === p.id ? null : p.id)}
              onChangeQty={setQty}
              onAdd={() => {
                onAdd(p, qty);
                // tras agregar, dejamos el panel abierto para que pueda agregar más
                // si quiere — el cart drawer se abre solo.
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function AccordionPanel({
  producto, active, cerrado, qty, onActivate, onChangeQty, onAdd,
}: {
  producto: Producto;
  active: boolean;
  cerrado: boolean;
  qty: number;
  onActivate: () => void;
  onChangeQty: (q: number) => void;
  onAdd: () => void;
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      onClick={!active ? onActivate : undefined}
      className={cn(
        'relative rounded-2xl sm:rounded-3xl overflow-hidden bg-cover bg-center h-full',
        active
          ? 'cursor-default flex-[5]'
          : 'cursor-pointer flex-[0.5] hover:opacity-95',
      )}
      style={{
        backgroundImage: producto.imagen ? `url(${producto.imagen})` : undefined,
        backgroundColor: producto.imagen ? undefined : 'var(--ce-ink)',
      }}
    >
      {/* Gradient overlay para legibilidad */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none" />

      {/* Tag POPULAR si aplica — esquina superior izquierda */}
      {producto.tag && (
        <span
          className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full text-white font-bold shadow-sm backdrop-blur"
          style={{ background: 'var(--ce-accent)' }}
        >
          {producto.tag}
        </span>
      )}

      {/* Precio — pill grande verde emerald, alto contraste sobre cualquier imagen.
          Oculto cuando expandido porque el total ya vive en "Agregar · $XX". */}
      {!active && (
        <span
          className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-lg ce-display tabular-nums ring-2 ring-emerald-500/40"
        >
          {formatMXN(producto.precio)}
        </span>
      )}

      {/* CONTENIDO COLAPSADO — título vertical legible de ABAJO HACIA ARRIBA con
          letras orientadas correctamente. Patrón: container fijo de N px rotado
          -90°, el texto dentro está en horizontal natural y trunca con ellipsis
          si excede. Después de la rotación visualmente se ve vertical, legible
          inclinando la cabeza hacia la izquierda (estándar idiomas occidentales). */}
      {!active && (
        <div className="absolute inset-0 grid place-items-center overflow-hidden pointer-events-none px-2">
          <div className="-rotate-90 origin-center w-[340px] sm:w-[400px] overflow-hidden">
            <p className="ce-display font-bold text-base sm:text-lg text-white text-center truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] tracking-tight">
              {producto.nombre}
            </p>
          </div>
        </div>
      )}

      {/* CONTENIDO EXPANDIDO — título + descripción + selector + agregar */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-white"
          >
            <h3 className="ce-display font-bold text-2xl sm:text-3xl md:text-4xl leading-tight">
              {producto.nombre}
            </h3>
            {producto.descripcion && (
              <p className="mt-2 text-sm sm:text-base opacity-90 leading-relaxed max-w-md">
                {producto.descripcion}
              </p>
            )}

            {/* Selector + botón agregar */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {/* Cantidad selector */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full p-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onChangeQty(Math.max(1, qty - 1)); }}
                  disabled={qty === 1}
                  aria-label="Restar"
                  className="w-9 h-9 rounded-full bg-white/20 grid place-items-center disabled:opacity-40 hover:bg-white/30 transition tap-target"
                >
                  <Icon name="minus" size={14} className="text-white" />
                </button>
                <span className="w-7 text-center font-bold tabular-nums text-lg">{qty}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onChangeQty(qty + 1); }}
                  aria-label="Sumar"
                  className="w-9 h-9 rounded-full bg-white/20 grid place-items-center hover:bg-white/30 transition tap-target"
                >
                  <Icon name="plus" size={14} className="text-white" />
                </button>
              </div>

              {/* CTA Agregar */}
              <button
                onClick={(e) => { e.stopPropagation(); if (!cerrado) onAdd(); }}
                disabled={cerrado}
                className={cn(
                  'flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-medium tap-target transition',
                  cerrado
                    ? 'bg-white/20 text-white/60 cursor-not-allowed'
                    : 'bg-white text-ink hover:scale-[1.02] active:scale-95 shadow-lg',
                )}
              >
                {cerrado ? (
                  <>
                    <Icon name="alert-triangle" size={16} />
                    Cerrado
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={16} />
                    Agregar · {formatMXN(producto.precio * qty)}
                  </>
                )}
              </button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cerrar panel (X) — botón rojo prominente arriba a la derecha cuando activo */}
      {active && (
        <button
          onClick={(e) => { e.stopPropagation(); onActivate(); }}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-red-500 grid place-items-center hover:bg-red-600 hover:scale-110 active:scale-95 transition-all shadow-lg ring-2 ring-red-400/50 z-30"
        >
          <Icon name="x" size={16} className="text-white" />
        </button>
      )}
    </motion.div>
  );
}

/* ───── ProductPreview legacy (mantenido por si se usa en otro lado) ───── */

function ProductPreview({
  product, cerrado, onClose, onAdd,
}: {
  product: Producto | null;
  cerrado: boolean;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) setQty(1);
  }, [product]);

  return (
    <AnimatePresence>
      {product && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%', opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-glass overflow-hidden max-h-[88vh] flex flex-col"
          >
            {/* Drag handle (estética en mobile) */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <span className="w-12 h-1 rounded-full bg-line" />
            </div>

            {/* Close button absolute */}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur grid place-items-center shadow-sm hover:bg-white tap-target"
            >
              <Icon name="x" size={18} />
            </button>

            {/* Imagen grande con zoom suave al entrar */}
            {product.imagen ? (
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-line/30">
                <motion.img
                  initial={{ scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  src={product.imagen}
                  alt={product.nombre}
                  className="w-full h-full object-cover"
                />
                {product.tag && (
                  <span
                    className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full text-white font-bold shadow-sm"
                    style={{ background: 'var(--ce-accent)' }}
                  >
                    {product.tag}
                  </span>
                )}
              </div>
            ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-line to-line/40" />
            )}

            <div className="flex-1 overflow-auto p-5 sm:p-6">
              <h3 className="ce-display text-2xl sm:text-3xl font-bold leading-tight">{product.nombre}</h3>
              {product.descripcion && (
                <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">{product.descripcion}</p>
              )}

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Precio</p>
                  <p className="ce-display text-2xl font-bold mt-0.5">{formatMXN(product.precio)}</p>
                </div>

                {/* Selector de cantidad +/- */}
                <div className="flex items-center gap-3 bg-[color:var(--ce-bg)] rounded-full p-1.5 border border-line">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty === 1}
                    aria-label="Restar"
                    className="w-9 h-9 rounded-full bg-white border border-line tap-target grid place-items-center hover:bg-line/40 disabled:opacity-40"
                  >
                    <Icon name="minus" size={14} />
                  </button>
                  <span className="w-7 text-center text-lg font-bold ce-display tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Sumar"
                    className="w-9 h-9 rounded-full bg-white border border-line tap-target grid place-items-center hover:bg-line/40"
                  >
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer con CTA "Agregar" — sticky */}
            <footer className="p-4 sm:p-5 border-t border-line pb-safe">
              <button
                onClick={() => !cerrado && onAdd(qty)}
                disabled={cerrado}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-white font-medium tap-target transition',
                  cerrado ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.98]',
                )}
                style={cerrado ? undefined : { background: 'var(--ce-accent)' }}
              >
                {cerrado ? (
                  <>
                    <Icon name="alert-triangle" size={16} />
                    Local cerrado
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={16} />
                    Agregar al pedido · {formatMXN(product.precio * qty)}
                  </>
                )}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
