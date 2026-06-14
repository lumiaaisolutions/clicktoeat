'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
} from 'framer-motion';
import { cn, formatMXN } from '@/lib/utils';
import { QRCode, downloadQR } from '@/components/ui/QRCode';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { PinnedFoodStory } from '@/components/landing/PinnedFoodStory';
import { WhyClickToEatSection } from '@/components/landing/WhyClickToEatSection';
import { SystemPreviewSection } from '@/components/landing/SystemPreviewSection';
import { BurgerSequence } from '@/components/landing/BurgerSequence';
import type { LocalDirectorio } from './page';

const FAV_KEY = 'clicktoeat:favs';
const NEARBY_RADIUS_KM = 15;

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

function abiertoDe(l: LocalDirectorio): boolean | null {
  return l.estado?.abierto ?? null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type Coords = { lat: number; lng: number };

export function DirectoryClient({ locales }: { locales: LocalDirectorio[] }) {
  const [q, setQ] = useState('');
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearbyActive, setNearbyActive] = useState(false);

  useEffect(() => {
    setFavs(readFavs());
    setHydrated(true);
  }, []);

  const toggleFav = (slug: string) => {
    setFavs((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      writeFavs(next);
      return next;
    });
  };

  function pedirUbicacion() {
    if (!('geolocation' in navigator)) {
      setGeoError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyActive(true);
        setLocating(false);
        const target = document.getElementById('cerca-de-ti');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'
            : 'No pudimos obtener tu ubicación. Intenta de nuevo.',
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const withDistance = useMemo(() => {
    return locales.map((l) => {
      let distancia: number | null = null;
      if (userCoords && l.lat != null && l.lng != null) {
        distancia = haversineKm(userCoords.lat, userCoords.lng, l.lat, l.lng);
      }
      return { ...l, distancia };
    });
  }, [locales, userCoords]);

  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const query = norm(q.trim());
    return withDistance.filter((l) => {
      if (onlyOpen && abiertoDe(l) === false) return false;
      if (!query) return true;
      return norm(l.nombre).includes(query)
          || norm(l.tagline ?? '').includes(query)
          || norm(l.direccion ?? '').includes(query)
          || norm(l.slug).includes(query);
    });
  }, [withDistance, q, onlyOpen]);

  const nearbyList = useMemo(() => {
    if (!userCoords) return [];
    return withDistance
      .filter((l) => l.distancia != null && l.distancia <= NEARBY_RADIUS_KM)
      .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
  }, [withDistance, userCoords]);

  const favoritos = hydrated ? filtered.filter((l) => favs.has(l.slug)) : [];
  const resto     = hydrated ? filtered.filter((l) => !favs.has(l.slug)) : filtered;

  const totalLocales = locales.length;
  const totalAbiertos = locales.filter((l) => abiertoDe(l) === true).length;

  return (
    <main className="min-h-screen relative">
      {/* Image-sequence scrubbing — anclado a la derecha del viewport por toda la landing */}
      <BurgerSequence />

      <Hero
        totalLocales={totalLocales}
        totalAbiertos={totalAbiertos}
        onCercaClick={pedirUbicacion}
        locating={locating}
      />

      {/* Cerca de ti */}
      {nearbyActive && (
        <NearbySection
          id="cerca-de-ti"
          list={nearbyList}
          radiusKm={NEARBY_RADIUS_KM}
          isFav={(slug) => favs.has(slug)}
          onToggleFav={toggleFav}
          onClose={() => { setNearbyActive(false); setUserCoords(null); }}
        />
      )}

      {geoError && !nearbyActive && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
            <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
            <span>{geoError}</span>
          </div>
        </div>
      )}

      {/* Controles + listado */}
      <section id="locales" className="px-4 sm:px-6 max-w-6xl mx-auto sticky top-0 z-30 glass border-y border-line py-3">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Mobile: search ocupa fila completa */}
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:w-auto">
            <Icon
              name="search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar local, comida, zona…"
              className="w-full pl-11 pr-3 py-3 rounded-2xl border border-line bg-white text-base outline-none focus:border-ink/50 min-h-[44px]"
            />
          </div>
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={cn(
              'flex-1 sm:flex-none px-4 py-3 rounded-2xl border text-sm font-medium whitespace-nowrap tap-target inline-flex items-center justify-center gap-2',
              onlyOpen ? 'bg-emerald-600 text-white border-transparent' : 'bg-white border-line hover:border-ink/40',
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', onlyOpen ? 'bg-white' : 'bg-emerald-500')} />
            Abierto ahora
          </button>
          <Link
            href="/login"
            className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-ink text-white text-sm font-medium whitespace-nowrap hover:opacity-90 tap-target inline-flex items-center justify-center gap-2"
          >
            <Icon name="storefront" size={16} />
            Soy dueño
          </Link>
        </div>
        {q && (
          <p className="text-xs text-muted mt-2">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </p>
        )}
      </section>

      {/* Favoritos */}
      {favoritos.length > 0 && (
        <section className="px-4 sm:px-6 pt-12 pb-2 max-w-6xl mx-auto">
          <SectionHeader
            kicker="Tus favoritos"
            title="Vuelve a pedir rápido"
            iconName="star-filled"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {favoritos.map((l) => (
                <LocalCard key={l.slug} local={l} isFav onToggleFav={toggleFav} />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Todos */}
      <section className="px-4 sm:px-6 pt-12 pb-24 max-w-6xl mx-auto">
        <SectionHeader
          kicker="Catálogo"
          title={favoritos.length > 0 ? 'Otros locales' : 'Locales en la plataforma'}
          iconName="utensils"
        />

        {locales.length === 0 ? (
          <EmptyState
            title="Sin locales disponibles"
            description="No pudimos cargar el directorio. Intenta de nuevo en un momento."
          />
        ) : resto.length === 0 ? (
          <EmptyState
            title="Nada encontrado"
            description={
              q
                ? `No encontramos locales que coincidan con "${q}".`
                : onlyOpen
                  ? 'Ninguno de los locales está abierto en este momento.'
                  : 'Sin locales para mostrar.'
            }
          />
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence>
              {resto.map((l) => (
                <LocalCard key={l.slug} local={l} isFav={favs.has(l.slug)} onToggleFav={toggleFav} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <PinnedFoodStory />
      <WhyClickToEatSection />
      <SystemPreviewSection />
      <CTAOwnerSection />
      <ShareQRSection />
      <Footer />
    </main>
  );
}

/* ─────────── Hero ─────────── */

function Hero({
  totalLocales, totalAbiertos, onCercaClick, locating,
}: {
  totalLocales: number;
  totalAbiertos: number;
  onCercaClick: () => void;
  locating: boolean;
}) {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);

  return (
    <section className="relative overflow-hidden">
      {/* mesh gradient orbs — solo los del lado izquierdo. El derecho lo
          ocupa BurgerSequence ahora. */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="hero-orb" style={{ background: '#FF2D2D', width: 480, height: 480, top: -120, left: -80 }} />
        <div className="hero-orb" style={{ background: '#10b981', width: 320, height: 320, bottom: -120, left: '20%', opacity: 0.15 }} />
      </div>

      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative px-6 pt-12 pb-20 sm:pt-16 sm:pb-28 max-w-6xl mx-auto"
      >
        {/* En desktop el texto se constriñe a la mitad izquierda — la derecha
            la cubre el canvas fixed con la hamburguesa. */}
        <div className="lg:max-w-[52%]">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Logo variant="lockup" size={36} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-10 text-xs sm:text-sm text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2"
          >
            <Icon name="sparkles" size={14} className="text-[color:var(--ce-accent)]" />
            Directorio de locales
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="ce-display mt-4 text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold leading-[0.95] tracking-tight"
          >
            Tu antojo,<br />
            a <span className="gradient-text">un mensaje</span><br />
            de distancia.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-5 max-w-md text-base sm:text-lg text-muted"
          >
            Pide directo por WhatsApp. Sin app, sin comisiones.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <button
              onClick={onCercaClick}
              disabled={locating}
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm sm:text-base font-medium hover:bg-ink/90 transition tap-target disabled:opacity-60"
            >
              <Icon name={locating ? 'compass' : 'navigation'} size={18} className={locating ? 'animate-spin' : ''} />
              {locating ? 'Buscando…' : 'Negocios cerca de ti'}
              {!locating && <Icon name="arrow-right" size={16} className="group-hover:translate-x-0.5 transition" />}
            </button>
            <a
              href="#locales"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-line bg-white/70 backdrop-blur text-sm sm:text-base font-medium hover:border-ink/40 transition tap-target"
            >
              <Icon name="utensils" size={18} />
              Ver todos los locales
            </a>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="mt-14 grid grid-cols-3 gap-3 sm:gap-6 max-w-xl"
          >
            <Stat value={totalLocales} label="locales" />
            <Stat value={totalAbiertos} label="abiertos" highlight />
            <Stat value="0%" label="comisión" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function Stat({ value, label, highlight }: { value: number | string; label: string; highlight?: boolean }) {
  const isNumeric = typeof value === 'number';
  const displayValue = isNumeric ? <CountUp to={value} /> : value;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="cursor-default"
    >
      <div className={cn(
        'ce-display text-3xl sm:text-4xl md:text-5xl font-bold leading-none flex items-center gap-2 tabular-nums',
        highlight && 'text-emerald-600',
      )}>
        {highlight && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 halo-pulse" />}
        {displayValue}
      </div>
      <div className="text-xs sm:text-sm text-muted mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

/**
 * Counter que animar 0 → value cuando entra al viewport. Usa rAF para no
 * re-renderizar React 60 veces — solo el textContent del span muta.
 */
function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || !ref.current) return;
    const start = performance.now();
    const node = ref.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      node.textContent = String(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, to, duration]);

  return <span ref={ref}>{started ? undefined : 0}</span>;
}

/* ─────────── Cerca de ti ─────────── */

function NearbySection({
  id, list, radiusKm, isFav, onToggleFav, onClose,
}: {
  id: string;
  list: (LocalDirectorio & { distancia: number | null })[];
  radiusKm: number;
  isFav: (slug: string) => boolean;
  onToggleFav: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="px-4 sm:px-6 pt-4 pb-12 max-w-6xl mx-auto"
    >
      <div className="rounded-3xl border border-ink/10 bg-gradient-to-br from-white to-amber-50/40 p-6 sm:p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
              <Icon name="navigation" size={14} className="text-[color:var(--ce-accent)]" />
              Cerca de ti
            </p>
            <h2 className="ce-display mt-2 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              {list.length > 0
                ? <>Encontramos <span className="gradient-text">{list.length}</span> en un radio de {radiusKm} km</>
                : 'No hay locales en tu zona todavía'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 w-10 h-10 rounded-full grid place-items-center border border-line bg-white hover:border-ink/40 tap-target"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {list.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {list.slice(0, 6).map((l) => (
              <LocalCard
                key={l.slug}
                local={l}
                distanciaKm={l.distancia ?? undefined}
                isFav={isFav(l.slug)}
                onToggleFav={onToggleFav}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Por ahora ningún local registrado tiene ubicación a {radiusKm} km. Mira todos los locales abajo —
            algunos pueden ofrecer envío a tu zona.
          </p>
        )}
      </div>
    </motion.section>
  );
}

/* ─────────── Sección header reusable ─────────── */

function SectionHeader({
  kicker, title, iconName,
}: { kicker: string; title: string; iconName: 'star-filled' | 'utensils' | 'sparkles' | 'storefront' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      className="mb-8 flex items-end justify-between flex-wrap gap-4"
    >
      <div>
        <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
          <Icon name={iconName} size={14} className="text-[color:var(--ce-accent)]" />
          {kicker}
        </p>
        <h2 className="ce-display mt-2 text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      {/* Línea decorativa que se expande de derecha a izquierda */}
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="h-px bg-line w-24 origin-right hidden sm:block"
      />
    </motion.div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-10 text-center">
      <Icon name="utensils" size={32} className="text-muted mx-auto" />
      <p className="ce-display text-xl font-bold mb-1 mt-3">{title}</p>
      <p className="text-muted text-sm">{description}</p>
    </div>
  );
}

/* ─────────── CTA owner ─────────── */

function CTAOwnerSection() {
  return (
    <section className="px-4 sm:px-6 py-20 sm:py-24 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="relative rounded-[2rem] border border-line bg-white overflow-hidden shadow-soft"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 10% 0%, rgba(255,45,45,0.10), transparent 40%),' +
              'radial-gradient(circle at 90% 100%, rgba(255,166,45,0.12), transparent 40%)',
          }}
        />
        <div className="relative grid md:grid-cols-2 gap-8 items-center p-8 sm:p-12">
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
              <Icon name="storefront" size={14} className="text-[color:var(--ce-accent)]" />
              ¿Tienes un local?
            </p>
            <h2 className="ce-display mt-2 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              Tu landing.<br />
              <span className="gradient-text">Tus reglas.</span>
            </h2>
            <p className="mt-4 text-muted max-w-sm">
              Catálogo, pedidos y métricas en un panel sin manual.
            </p>

            <ul className="mt-6 space-y-3">
              {[
                'URL pública: tudominio.com/tu-local',
                'Inventario, recetas y métricas',
                'Sin tarifas escondidas',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 grid place-items-center mt-0.5 shrink-0">
                    <Icon name="check" size={12} className="text-emerald-700" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-ink text-white text-sm sm:text-base font-medium hover:opacity-90 tap-target group"
            >
              Registrar mi local
              <Icon name="arrow-right" size={16} className="group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Mockup tipo "phone preview" */}
          <div className="relative">
            <PhoneMockup />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto float-slow w-full max-w-[260px] sm:max-w-[280px]">
      <div className="rounded-[2.2rem] border-[10px] border-ink bg-ink shadow-2xl overflow-hidden">
        <div className="relative aspect-[9/19] bg-[color:var(--ce-bg)]">
          {/* Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-ink rounded-full z-10" />
          {/* Contenido */}
          <div className="absolute inset-0 pt-10 px-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold ce-display" style={{ background: '#FF2D2D' }}>T</div>
              <div>
                <div className="ce-display font-bold leading-tight">Tu Local</div>
                <div className="text-[10px] text-muted">tu-tagline</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="rounded-xl border border-line bg-white p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Producto destacado</div>
                  <div className="text-[10px] text-muted">$ 0.00</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-ink text-white grid place-items-center">
                  <Icon name="plus" size={14} />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-white p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Producto B</div>
                  <div className="text-[10px] text-muted">$ 0.00</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-ink text-white grid place-items-center">
                  <Icon name="plus" size={14} />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-white p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Producto C</div>
                  <div className="text-[10px] text-muted">$ 0.00</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-ink text-white grid place-items-center">
                  <Icon name="plus" size={14} />
                </div>
              </div>
            </div>
            <div className="absolute left-3 right-3 bottom-3 rounded-xl bg-emerald-600 text-white text-xs font-medium py-2.5 grid place-items-center gap-1">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="whatsapp" size={14} />
                Enviar pedido por WhatsApp
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Share QR ─────────── */

function ShareQRSection() {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUrl(window.location.origin);
  }, []);

  if (!mounted || !url) return null;

  return (
    <section className="border-t border-line bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid md:grid-cols-2 gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="order-2 md:order-1"
        >
          <p className="text-xs text-muted font-medium uppercase tracking-[0.18em] inline-flex items-center gap-2">
            <Icon name="qr-code" size={14} className="text-[color:var(--ce-accent)]" />
            Llévatelo contigo
          </p>
          <h2 className="ce-display mt-2 text-3xl md:text-4xl font-bold leading-tight">
            Escanea, abre, guarda.
          </h2>
          <p className="mt-3 text-muted max-w-sm">
            Apunta tu cámara al QR. ClickToEat siempre a mano.
          </p>
          <div className="mt-5 flex gap-2 flex-wrap">
            <button
              onClick={() => downloadQR(url, 'clicktoeat-qr.png', { size: 1024 })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-ink text-white text-sm font-medium tap-target hover:opacity-90"
            >
              <Icon name="download" size={16} />
              Descargar QR
            </button>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
                catch { /* ignore */ }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-line text-sm font-medium tap-target hover:border-ink/40"
            >
              <Icon name={copied ? 'check' : 'copy'} size={16} />
              {copied ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="order-1 md:order-2 flex justify-center"
        >
          <div className="text-center">
            <QRCode value={url} size={220} color="#0B0B0F" framed />
            <p className="text-xs text-muted mt-2 break-all">{url.replace(/^https?:\/\//, '')}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────── Footer ─────────── */

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-[color:var(--ce-bg)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <Logo variant="lockup" size={32} />
          <p className="mt-3 text-sm text-muted max-w-xs">
            Pedidos por WhatsApp para tu local. Sin app, sin cuenta, sin comisiones.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-3">Explora</p>
          <ul className="space-y-2 text-sm">
            <li><a href="#locales" className="link-underline">Directorio de locales</a></li>
            <li><Link href="/login" className="link-underline">Soy dueño</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted mb-3">Acerca</p>
          <a
            href="https://lumiaaisolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium hover:text-[color:var(--ce-accent)] transition group"
          >
            Desarrollado por LUMIA
            <Icon name="arrow-up-right" size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
          <p className="text-xs text-muted mt-2">Soluciones digitales para la hostelería.</p>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-center sm:justify-start text-xs text-muted">
          <p>© {year} ClickToEat. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────── Local Card ─────────── */

function LocalCard({
  local, isFav, onToggleFav, distanciaKm,
}: {
  local: LocalDirectorio;
  isFav: boolean;
  onToggleFav: (slug: string) => void;
  distanciaKm?: number;
}) {
  const abierto = abiertoDe(local);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse tracking para spotlight + tilt 3D sutil.
  // useSpring suaviza el seguimiento — sin spring, el cursor se siente "saltarín".
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 25 });

  const rotateX = useTransform(smoothY, [0, 1], [3, -3]);
  const rotateY = useTransform(smoothX, [0, 1], [-3, 3]);
  const spotlightX = useTransform(smoothX, (v) => `${v * 100}%`);
  const spotlightY = useTransform(smoothY, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${spotlightX} ${spotlightY}, rgba(255,45,45,0.10), transparent 50%)`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  return (
    <motion.article
      ref={cardRef}
      layout
      variants={{
        hidden:  { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      whileHover={{ y: -6 }}
      className="group relative rounded-3xl border border-line bg-white shadow-soft hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.22)] transition-shadow [transform-style:preserve-3d]"
    >
      {/* Spotlight que sigue al cursor — capa encima de la card */}
      <motion.span
        aria-hidden
        style={{ background: spotlight }}
        className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
      />

      {/* Star — top right, fuera del flujo */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleFav(local.slug); }}
        aria-label={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
        className={cn(
          'absolute top-3 right-3 z-20 w-10 h-10 rounded-full grid place-items-center backdrop-blur transition tap-target',
          isFav ? 'bg-amber-400 text-white shadow-md' : 'bg-white/85 hover:bg-white text-ink/70',
        )}
      >
        <Icon name={isFav ? 'star-filled' : 'star'} size={16} />
      </button>

      {/* Badges superiores — opuesto al star, evitan colisión con avatar */}
      <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
        {abierto !== null && (
          <span className={cn(
            'px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium inline-flex items-center gap-1.5 backdrop-blur shadow-sm',
            abierto ? 'bg-emerald-600/95 text-white' : 'bg-black/60 text-white',
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              abierto ? 'bg-white halo-pulse' : 'bg-white/70',
            )} />
            {abierto ? 'Abierto' : 'Cerrado'}
          </span>
        )}
        {distanciaKm !== undefined && (
          <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-[11px] font-medium text-ink/85 inline-flex items-center gap-1.5 shadow-sm">
            <Icon name="navigation" size={11} className="text-[color:var(--ce-accent)]" />
            {distanciaKm.toFixed(distanciaKm < 1 ? 2 : 1)} km
          </span>
        )}
      </div>

      <Link href={`/${local.slug}`} className="block rounded-3xl overflow-hidden">
        {/* Banner con zoom-in en hover y overlay para legibilidad del avatar */}
        <div className="relative h-44 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.06]"
            style={{
              backgroundImage: local.banner ? `url(${local.banner})` : undefined,
              background: !local.banner
                ? `linear-gradient(135deg, ${local.colorPrimario}33, ${local.colorPrimario}11)`
                : undefined,
            }}
          />
          {/* Gradient overlay bottom-to-top para asegurar contraste del avatar */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />
        </div>

        {/* Avatar overlap — bottom-left del banner, no colisiona con badges arriba */}
        <div className="relative px-5">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-14 h-14 rounded-full -mt-7 border-[3px] border-white shadow-md grid place-items-center text-white font-bold ce-display overflow-hidden relative z-10"
            style={{ background: local.colorPrimario }}
          >
            {local.logo
              ? <img src={local.logo} alt="" className="w-full h-full rounded-full object-cover" />
              : <span className="text-xl">{local.nombre.charAt(0)}</span>}
          </motion.div>
        </div>

        <div className="px-5 pt-3 pb-5">
          <h3 className="ce-display text-xl font-bold leading-tight truncate">{local.nombre}</h3>
          {local.tagline && (
            <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">{local.tagline}</p>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {local.productosCount !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[color:var(--ce-bg)] border border-line text-[11px] text-ink/70">
                <Icon name="utensils" size={11} />
                {local.productosCount}
              </span>
            )}
            {local.deliveryMinutos > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[color:var(--ce-bg)] border border-line text-[11px] text-ink/70">
                <Icon name="clock" size={11} />
                ~{local.deliveryMinutos} min
              </span>
            )}
            {local.deliveryFee > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[color:var(--ce-bg)] border border-line text-[11px] text-ink/70">
                <Icon name="truck" size={11} />
                {formatMXN(local.deliveryFee)}
              </span>
            )}
          </div>

          {local.direccion && (
            <p className="mt-3 text-xs text-muted truncate inline-flex items-center gap-1.5">
              <Icon name="map-pin" size={11} className="shrink-0 text-ink/40" />
              {local.direccion}
            </p>
          )}

          {/* CTA con doble arrow animado */}
          <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
            <span className="text-sm font-medium ce-display group-hover:text-[color:var(--ce-accent)] transition">
              Ver menú
            </span>
            <span className="relative inline-flex items-center justify-end w-6 overflow-hidden">
              <Icon
                name="arrow-right"
                size={16}
                className="text-ink/70 group-hover:text-[color:var(--ce-accent)] transition-all duration-300 group-hover:translate-x-6"
              />
              <Icon
                name="arrow-right"
                size={16}
                className="absolute right-0 -translate-x-6 text-[color:var(--ce-accent)] transition-transform duration-300 group-hover:translate-x-0"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
