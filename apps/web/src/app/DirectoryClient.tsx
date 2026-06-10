'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatMXN } from '@/lib/utils';
import { QRCode, downloadQR } from '@/components/ui/QRCode';
import { Logo } from '@/components/ui/Logo';
import type { LocalDirectorio } from './page';

const FAV_KEY = 'clicktoeat:favs';

function readFavs(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function writeFavs(favs: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

/**
 * Estado abierto/cerrado calculado SERVER-SIDE (campo `estado`).
 * No volvemos a calcular con `new Date()` en el cliente para evitar
 * hydration mismatch entre la hora del server y la del cliente.
 */
function abiertoDe(l: LocalDirectorio): boolean | null {
  return l.estado?.abierto ?? null;
}

export function DirectoryClient({ locales }: { locales: LocalDirectorio[] }) {
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);

  useEffect(() => {
    setFavs(readFavs());
    setHydrated(true);
  }, []);

  const toggleFav = (slug: string) => {
    setFavs((cur) => {
      const next = new Set(cur);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      writeFavs(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const query = norm(q.trim());
    return locales.filter((l) => {
      if (onlyOpen && abiertoDe(l) === false) return false;
      if (!query) return true;
      return norm(l.nombre).includes(query)
          || norm(l.tagline ?? '').includes(query)
          || norm(l.direccion ?? '').includes(query)
          || norm(l.slug).includes(query);
    });
  }, [locales, q, onlyOpen]);

  const favoritos = hydrated ? filtered.filter((l) => favs.has(l.slug)) : [];
  const resto     = hydrated ? filtered.filter((l) => !favs.has(l.slug)) : filtered;

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="px-6 pt-16 pb-8 max-w-6xl mx-auto">
        <div className="mb-4">
          <Logo variant="lockup" size={36} />
        </div>
        <p className="text-sm text-muted font-medium uppercase tracking-wider">Directorio de locales</p>
        <h1 className="ce-display mt-3 text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.05]">
          Tu antojo,<br />
          a <span style={{ color: 'var(--ce-accent)' }}>un mensaje</span> de distancia.
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-muted">
          Elige tu local favorito y haz tu pedido directo por WhatsApp. Sin app, sin cuenta, sin comisiones.
        </p>
      </section>

      {/* CONTROLES */}
      <section id="locales" className="px-4 sm:px-6 max-w-6xl mx-auto sticky top-0 z-20 glass border-y border-line py-3 -my-px">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar local, comida, zona…"
              className="w-full pl-10 pr-3 py-3 rounded-2xl border border-line bg-white text-base outline-none focus:border-ink/50 min-h-[44px]"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg">🔍</span>
          </div>
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={cn(
              'px-4 py-3 rounded-2xl border text-sm font-medium whitespace-nowrap tap-target',
              onlyOpen ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-line hover:border-ink/40',
            )}
          >
            ● Abierto ahora
          </button>
          <Link
            href="/login"
            className="px-4 py-3 rounded-2xl bg-ink text-white text-sm font-medium whitespace-nowrap hover:opacity-90 tap-target"
          >
            Soy dueño
          </Link>
        </div>
        {q && (
          <p className="text-xs text-muted mt-2">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </p>
        )}
      </section>

      {/* FAVORITOS */}
      {favoritos.length > 0 && (
        <section className="px-4 sm:px-6 pt-8 pb-2 max-w-6xl mx-auto">
          <h2 className="ce-display text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
            <span>⭐ Tus favoritos</span>
            <span className="text-xs text-muted font-normal">· vuelve a pedir rápido</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {favoritos.map((l) => (
                <LocalCard key={l.slug} local={l} isFav onToggleFav={toggleFav} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* TODOS */}
      <section className="px-4 sm:px-6 pt-8 pb-24 max-w-6xl mx-auto">
        <h2 className="ce-display text-xl md:text-2xl font-bold mb-4">
          {favoritos.length > 0 ? 'Otros locales' : 'Locales en la plataforma'}
        </h2>

        {locales.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center">
            <p className="ce-display text-xl font-bold mb-2">Sin locales disponibles</p>
            <p className="text-muted text-sm">No pudimos cargar el directorio. Intenta de nuevo en un momento.</p>
          </div>
        ) : resto.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">
            {q
              ? <>No encontramos locales que coincidan con <strong className="text-ink">"{q}"</strong>.</>
              : onlyOpen
                ? 'Ninguno de los locales está abierto en este momento.'
                : 'Sin locales para mostrar.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {resto.map((l) => (
                <LocalCard key={l.slug} local={l} isFav={favs.has(l.slug)} onToggleFav={toggleFav} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* SECCIÓN QR — llévatelo en el celular */}
      <ShareQRSection />

      <footer className="border-t border-line bg-white px-4 sm:px-6 py-8 text-center text-sm text-muted">
        Hecho con <span style={{ color: 'var(--ce-accent)' }}>♥</span> en ClickToEat ·{' '}
        <Link href="/login" className="underline">Soy dueño y quiero registrar mi local</Link>
      </footer>
    </main>
  );
}

// ─── Sección QR de la home ──────────────────────────────────────
function ShareQRSection() {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setMounted(true);
    // window solo existe en cliente — usamos location.origin para que
    // funcione en cualquier deploy sin hardcodear la URL.
    setUrl(window.location.origin);
  }, []);

  if (!mounted || !url) return null;

  return (
    <section className="border-t border-line bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <p className="text-sm text-muted font-medium uppercase tracking-wider">Llévatelo en el celular</p>
          <h2 className="ce-display mt-2 text-3xl md:text-4xl font-bold leading-tight">
            Escanea y abre ClickToEat en tu móvil.
          </h2>
          <p className="mt-3 text-muted max-w-lg">
            Apunta la cámara de tu celular al QR. Se abrirá esta misma página
            y podrás guardarla en tu pantalla de inicio para acceso rápido.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={() => downloadQR(url, 'clicktoeat-qr.png', { size: 1024 })}
              className="px-4 py-2 rounded-2xl bg-ink text-white text-sm font-medium tap-target"
            >
              ⬇ Descargar QR
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                } catch { /* ignore */ }
              }}
              className="px-4 py-2 rounded-2xl border border-line text-sm font-medium tap-target"
            >
              📋 Copiar link
            </button>
          </div>
        </div>

        <div className="order-1 md:order-2 flex justify-center">
          <div className="text-center">
            <QRCode value={url} size={220} color="#0B0B0F" framed />
            <p className="text-xs text-muted mt-2 break-all">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LocalCard({
  local, isFav, onToggleFav,
}: { local: LocalDirectorio; isFav: boolean; onToggleFav: (slug: string) => void }) {
  const abierto = abiertoDe(local);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="group relative rounded-3xl overflow-hidden border border-line bg-white shadow-soft hover:shadow-glass transition"
    >
      <button
        onClick={(e) => { e.preventDefault(); onToggleFav(local.slug); }}
        aria-label={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
        className={cn(
          'absolute top-3 right-3 z-10 w-10 h-10 rounded-full grid place-items-center backdrop-blur transition tap-target',
          isFav ? 'bg-amber-400 text-white' : 'bg-white/80 hover:bg-white text-ink/60',
        )}
      >
        {isFav ? '★' : '☆'}
      </button>

      <Link href={`/${local.slug}`} className="block">
        <div
          className="h-44 bg-cover bg-center relative"
          style={{
            backgroundImage: local.banner ? `url(${local.banner})` : undefined,
            background: !local.banner
              ? `linear-gradient(135deg, ${local.colorPrimario}33, ${local.colorPrimario}11)`
              : undefined,
          }}
        >
          {abierto !== null && (
            <span className={cn(
              'absolute bottom-3 left-3 px-2 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium',
              abierto ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white',
            )}>
              {abierto ? '● Abierto' : '○ Cerrado'}
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full -mt-10 border-2 border-white shadow-soft shrink-0 grid place-items-center text-white font-bold ce-display"
              style={{ background: local.colorPrimario }}
            >
              {local.logo
                ? <img src={local.logo} alt="" className="w-full h-full rounded-full object-cover" />
                : local.nombre.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="ce-display text-lg font-bold truncate">{local.nombre}</h3>
              {local.tagline && <p className="text-xs text-muted line-clamp-2 mt-0.5">{local.tagline}</p>}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-muted flex-wrap">
            {local.productosCount !== undefined && (
              <span>{local.productosCount} {local.productosCount === 1 ? 'producto' : 'productos'}</span>
            )}
            {local.deliveryMinutos > 0 && (
              <>
                <span>·</span>
                <span>~{local.deliveryMinutos} min</span>
              </>
            )}
            {local.deliveryFee > 0 && (
              <>
                <span>·</span>
                <span>Envío {formatMXN(local.deliveryFee)}</span>
              </>
            )}
          </div>

          {local.direccion && (
            <p className="mt-2 text-xs text-muted truncate">📍 {local.direccion}</p>
          )}

          <p className="mt-4 text-sm font-medium text-ink group-hover:underline flex items-center gap-1">
            Ver menú →
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
