'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/api';
import type { MetricasResponse } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn, formatMXN } from '@/lib/utils';

type Preset = 'hoy' | 'ayer' | '7d' | '30d' | 'mes' | 'custom';

const ACCENT = '#F26A1F';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'custom', label: 'Custom' },
];

const ESTADOS_LABEL: Record<string, string> = {
  nuevo: 'Nuevos', confirmado: 'Confirmados', preparando: 'Preparando',
  listo: 'Listos', en_camino: 'En camino', entregado: 'Entregados', cancelado: 'Cancelados',
};

// color semántico por estado (tinta + fondo suave)
const ESTADOS_COLOR: Record<string, { fg: string; bg: string }> = {
  nuevo:      { fg: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  confirmado: { fg: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  preparando: { fg: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  listo:      { fg: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
  en_camino:  { fg: '#F26A1F', bg: 'rgba(242,106,31,0.12)' },
  entregado:  { fg: '#059669', bg: 'rgba(5,150,105,0.12)' },
  cancelado:  { fg: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
};

const ENTREGA_LABEL: Record<string, string> = {
  pickup: 'Recoger', delivery: 'A domicilio', sucursal: 'Sucursal',
};

const PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta_entrega: 'Tarjeta a entrega',
  tarjeta_tpv: 'Tarjeta TPV', transferencia: 'Transferencia',
};

interface UtilidadSerie {
  mes: string; label: string;
  ventas_mxn: number; gastos_mxn: number; utilidad_mxn: number; margen_pct: number | null;
}
interface UtilidadResponse {
  meses: number;
  serie: UtilidadSerie[];
  total_ventas: number;
  total_gastos: number;
  total_utilidad: number;
  margen_promedio: number | null;
}

export default function MetricasPage() {
  const [data, setData] = useState<MetricasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('30d');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [utilidad, setUtilidad] = useState<UtilidadResponse | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = preset === 'custom'
        ? { desde: desde || undefined, hasta: hasta || undefined }
        : { preset };
      const [{ data: r }, { data: u }] = await Promise.all([
        api.get<{ data: MetricasResponse }>('/metricas', { params }),
        api.get<{ data: UtilidadResponse }>('/metricas/utilidad', { params: { meses: 6 } }),
      ]);
      setData(r.data);
      setUtilidad(u.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [preset, desde, hasta]);

  return (
    <div>
      <AdminPageHeader
        kicker="Reportes"
        kickerIcon="chart"
        title="Tus números,"
        titleAccent="del día y del mes."
        description="Ventas, ticket promedio, productos más pedidos. Todo actualizado en tiempo real."
        tourSlug="metricas"
      />

      {/* Control de rango — segmented con indicador deslizante */}
      <RangePicker
        preset={preset} setPreset={setPreset}
        desde={desde} setDesde={setDesde}
        hasta={hasta} setHasta={setHasta}
      />

      {loading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Kpi index={0} icon="chart" title="Ventas" accent
              value={data.resumen.ventas_total} format={formatMXN}
              hint={`${data.resumen.pedidos} pedidos`} />
            <Kpi index={1} icon="card" title="Ticket promedio"
              value={data.resumen.ticket_promedio} format={formatMXN}
              hint={data.rango.dias === 1 ? 'hoy' : `${data.rango.dias} días`} />
            <Kpi index={2}
              icon={data.resumen.margen_aprox >= 0 ? 'trending-up' : 'trending-down'}
              title="Margen aprox"
              value={data.resumen.margen_aprox} format={formatMXN}
              hint={`${data.resumen.margen_pct}% · compras ${formatMXN(data.resumen.costo_compras)}`}
              tone={data.resumen.margen_aprox >= 0 ? 'pos' : 'neg'} />
            <Kpi index={3}
              icon={data.resumen.bajo_stock > 0 ? 'alert-triangle' : 'package'}
              title="Bajo stock"
              value={data.resumen.bajo_stock} format={(n) => Math.round(n).toString()}
              hint="ingredientes"
              tone={data.resumen.bajo_stock > 0 ? 'warn' : 'neutral'} />
          </section>

          {/* Gráfica de ventas diarias */}
          <Reveal index={0}>
            <section className="rounded-2xl border border-line bg-white p-4 mb-4">
              <h2 className="ce-display font-bold mb-3">Ventas por día</h2>
              <SerieChart serie={data.serie_diaria} />
            </section>
          </Reveal>

          {/* Utilidad neta — Ventas vs Gastos por mes (últimos 6) */}
          {utilidad && (
            <Reveal index={1}>
              <section className="rounded-2xl border border-line bg-white p-4 mb-4">
                <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <h2 className="ce-display font-bold">Utilidad neta</h2>
                    <p className="text-xs text-muted">Ventas menos gastos operativos · últimos {utilidad.meses} meses</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('ce-display text-2xl font-bold tabular-nums', utilidad.total_utilidad >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                      {formatMXN(utilidad.total_utilidad)}
                    </p>
                    {utilidad.margen_promedio !== null && (
                      <p className="text-xs text-muted">{utilidad.margen_promedio}% margen prom.</p>
                    )}
                  </div>
                </div>
                <UtilidadChart serie={utilidad.serie} totalVentas={utilidad.total_ventas} totalGastos={utilidad.total_gastos} />
              </section>
            </Reveal>
          )}

          {/* Heatmap día × hora */}
          {data.heatmap && (
            <Reveal index={2}>
              <section className="rounded-2xl border border-line bg-white p-4 mb-4">
                <h2 className="ce-display font-bold mb-1">¿A qué hora te piden más?</h2>
                <p className="text-xs text-muted mb-3">Filas = día de la semana. Columnas = hora del día. Color más oscuro = más pedidos.</p>
                <Heatmap matrix={data.heatmap} />
              </section>
            </Reveal>
          )}

          {/* Top + Low productos */}
          <Reveal index={3}>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <h2 className="ce-display font-bold mb-3">Tus productos estrella</h2>
                <TopProductos items={data.top_productos} />
              </div>

              {data.low_productos && data.low_productos.length > 0 && (
                <div className="rounded-2xl border border-line bg-white p-4">
                  <h2 className="ce-display font-bold mb-1">Tus productos que no se mueven</h2>
                  <p className="text-xs text-muted mb-3">Considera quitarlos del menú o repensar precio / foto.</p>
                  <LowProductos items={data.low_productos} />
                </div>
              )}
            </section>
          </Reveal>

          {/* Métodos de entrega / pago */}
          <Reveal index={4}>
            <section className="rounded-2xl border border-line bg-white p-4 mb-4">
              <h2 className="ce-display font-bold mb-3">Por método de entrega</h2>
              <DistribucionList map={data.por_entrega} labels={ENTREGA_LABEL}
                total={data.resumen.pedidos} />

              <h2 className="ce-display font-bold mt-5 mb-3">Por método de pago</h2>
              <DistribucionList map={data.por_pago} labels={PAGO_LABEL}
                total={data.resumen.pedidos} />
            </section>
          </Reveal>

          {/* Pedidos por estado */}
          <Reveal index={5}>
            <section className="rounded-2xl border border-line bg-white p-4">
              <h2 className="ce-display font-bold mb-3">Pedidos por estado</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {Object.entries(data.por_estado).length === 0 ? (
                  <p className="text-sm text-muted col-span-full">Sin pedidos en el rango.</p>
                ) : Object.entries(ESTADOS_LABEL).map(([key, label], i) => (
                  <EstadoChip key={key} index={i} label={label}
                    value={(data.por_estado as Record<string, number>)[key] ?? 0}
                    color={ESTADOS_COLOR[key]} />
                ))}
              </div>
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}

// ─── Control de rango ───────────────────────────────────────────

function RangePicker({
  preset, setPreset, desde, setDesde, hasta, setHasta,
}: {
  preset: Preset; setPreset: (p: Preset) => void;
  desde: string; setDesde: (v: string) => void;
  hasta: string; setHasta: (v: string) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="mb-4">
      <div
        role="tablist"
        aria-label="Rango de fechas"
        className="inline-flex flex-wrap gap-1 p-1 rounded-2xl border border-line bg-line/15"
      >
        {PRESETS.map(({ key, label }) => {
          const active = preset === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setPreset(key)}
              className={cn(
                'relative min-h-[40px] px-3.5 rounded-xl text-sm font-medium transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-[var(--ce-accent,#F26A1F)] focus-visible:ring-offset-1',
                active ? 'text-white' : 'text-muted hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="range-active"
                  className="absolute inset-0 rounded-xl bg-ink shadow-sm"
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {preset === 'custom' && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-end gap-3 pt-3">
              <label className="flex flex-col gap-1 text-xs text-muted">
                Desde
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                  className="px-3 py-2 border border-line rounded-xl bg-white text-sm text-ink min-h-[44px] focus:border-transparent focus:ring-2 focus:ring-[var(--ce-accent,#F26A1F)] outline-none" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                Hasta
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                  className="px-3 py-2 border border-line rounded-xl bg-white text-sm text-ink min-h-[44px] focus:border-transparent focus:ring-2 focus:ring-[var(--ce-accent,#F26A1F)] outline-none" />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Utilidades de animación ────────────────────────────────────

/** Anima un número de 0 al target con requestAnimationFrame (easeOutCubic). */
function useCountUp(target: number, duration = 900): number {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) { setVal(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return val;
}

function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const v = useCountUp(value);
  return <span className={className}>{format(v)}</span>;
}

/** Contenedor de sección con entrada fade+rise escalonada. */
function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.34, delay: reduce ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── KPI cards ──────────────────────────────────────────────────

function Kpi({
  index, icon, title, value, format, hint, accent, tone,
}: {
  index: number; icon: IconName; title: string; value: number;
  format: (n: number) => string; hint?: string;
  accent?: boolean; tone?: 'pos' | 'neg' | 'warn' | 'neutral';
}) {
  const reduce = useReducedMotion();
  const toneClass = tone === 'pos' ? 'text-emerald-600'
    : tone === 'neg' ? 'text-red-600'
    : tone === 'warn' ? 'text-amber-600'
    : accent ? 'text-ink' : 'text-ink';

  const iconWrap = accent
    ? { color: ACCENT, background: 'rgba(242,106,31,0.12)' }
    : tone === 'pos' ? { color: '#059669', background: 'rgba(5,150,105,0.12)' }
    : tone === 'neg' ? { color: '#DC2626', background: 'rgba(220,38,38,0.10)' }
    : tone === 'warn' ? { color: '#D97706', background: 'rgba(217,119,6,0.12)' }
    : { color: '#6B6B6B', background: 'rgba(0,0,0,0.05)' };

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.32, delay: reduce ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -3 }}
      className={cn(
        'group rounded-2xl border bg-white p-4 transition-shadow hover:shadow-[0_14px_34px_-18px_rgba(20,12,6,0.4)]',
        accent ? 'border-ink/70' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
        <span className="grid place-items-center w-8 h-8 rounded-xl shrink-0" style={iconWrap}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <CountUp value={value} format={format}
        className={cn('ce-display text-xl md:text-2xl font-bold mt-2 block truncate tabular-nums', toneClass)} />
      {hint && <p className="text-xs text-muted mt-1 truncate">{hint}</p>}
    </motion.div>
  );
}

// ─── Gráfica de ventas por día ──────────────────────────────────

function SerieChart({ serie }: { serie: MetricasResponse['serie_diaria'] }) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (serie.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">Sin datos para el rango.</p>;
  }

  const maxV = Math.max(...serie.map((s) => s.ventas), 1);
  const W = 600, H = 180, padX = 30, padY = 10;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xFor = (i: number) => padX + (i / Math.max(serie.length - 1, 1)) * innerW;
  const yFor = (v: number) => padY + innerH - (v / maxV) * innerH;

  const linePath = serie.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(s.ventas)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(serie.length - 1)} ${padY + innerH} L ${xFor(0)} ${padY + innerH} Z`;

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((x - padX) / innerW) * (serie.length - 1));
    setHover(Math.max(0, Math.min(serie.length - 1, i)));
  };

  const s = hover !== null ? serie[hover] : null;
  const hx = hover !== null ? xFor(hover) : 0;
  const hy = s ? yFor(s.ventas) : 0;

  // caja de tooltip (dentro del viewBox para alinearse exactamente)
  const boxW = 128, boxH = 46;
  let bx = hx + 10;
  if (bx + boxW > W - 4) bx = hx - 10 - boxW;
  if (bx < 4) bx = 4;
  let by = hy - boxH - 10;
  if (by < 2) by = hy + 12;

  const fechaFmt = s ? new Date(s.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H + 30}`}
        className="w-full min-w-[500px] h-auto touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="serie-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t}
            x1={padX} x2={padX + innerW}
            y1={padY + innerH * (1 - t)} y2={padY + innerH * (1 - t)}
            stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
        ))}

        {/* Área */}
        <motion.path d={areaPath} fill="url(#serie-fill)"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.4 }} />

        {/* Línea que se dibuja */}
        <motion.path d={linePath} fill="none" stroke={ACCENT} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 1.05, ease: 'easeInOut' }} />

        {/* Crosshair + punto resaltado */}
        {s && (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={padY} y2={padY + innerH}
              stroke={ACCENT} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="5.5" fill={ACCENT} stroke="white" strokeWidth="2.5" />
            <g>
              <rect x={bx} y={by} width={boxW} height={boxH} rx="10"
                fill="white" stroke="rgba(0,0,0,0.08)" />
              <text x={bx + 10} y={by + 17} fontSize="11" fontWeight="700" fill="#1A1A1A" className="capitalize">{fechaFmt}</text>
              <text x={bx + 10} y={by + 31} fontSize="10.5" fill="#6B6B6B">{s.pedidos} pedidos</text>
              <text x={bx + 10} y={by + 43} fontSize="11" fontWeight="700" fill={ACCENT}>{formatMXN(s.ventas)}</text>
            </g>
          </g>
        )}

        {/* Labels eje X */}
        {[0, Math.floor(serie.length * 0.5), serie.length - 1].map((i, k) => {
          if (i < 0 || i >= serie.length) return null;
          const d = new Date(serie[i].fecha + 'T12:00:00');
          return (
            <text key={k} x={xFor(i)} y={H + 18} fontSize="10" fill="#6B6B6B" textAnchor="middle">
              {d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Top productos (barras animadas + medallas) ─────────────────

const MEDALLAS = ['#D4A017', '#9AA0A6', '#B06A34']; // oro, plata, bronce

function TopProductos({ items }: { items: MetricasResponse['top_productos'] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  if (items.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">Sin ventas en el rango.</p>;
  }
  const maxQty = Math.max(...items.map((i) => i.cantidad), 1);
  return (
    <ul className="space-y-1">
      {items.map((p, i) => {
        const pct = (p.cantidad / maxQty) * 100;
        const isTop = i < 3;
        const active = hover === i;
        return (
          <li
            key={p.producto_nombre + i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn('rounded-xl px-2 py-1.5 -mx-2 transition-colors', active && 'bg-line/25')}
          >
            <div className="flex items-center gap-2 text-sm mb-1">
              <span
                className="grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 text-white"
                style={{ background: isTop ? MEDALLAS[i] : 'rgba(0,0,0,0.28)' }}
              >
                {i + 1}
              </span>
              <span className="truncate font-medium flex-1">{p.producto_nombre}</span>
              <span className="text-muted whitespace-nowrap text-xs tabular-nums">
                {p.cantidad} · {formatMXN(p.ingresos)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-line/40 overflow-hidden ml-7">
              <motion.div
                className="h-full rounded-full"
                style={{ background: ACCENT }}
                initial={reduce ? { width: `${pct}%` } : { width: 0 }}
                animate={{ width: `${pct}%`, opacity: active ? 1 : 0.9 }}
                transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Distribución (entrega / pago) ──────────────────────────────

function DistribucionList({
  map, labels, total,
}: {
  map: Record<string, { pedidos: number; monto: number }>;
  labels: Record<string, string>;
  total: number;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const entries = Object.entries(map);
  if (entries.length === 0 || total === 0) {
    return <p className="text-sm text-muted">Sin datos.</p>;
  }
  return (
    <ul className="space-y-1">
      {entries.map(([key, v], i) => {
        const pct = total > 0 ? (v.pedidos / total) * 100 : 0;
        const active = hover === key;
        return (
          <li
            key={key}
            onMouseEnter={() => setHover(key)}
            onMouseLeave={() => setHover(null)}
            className={cn('rounded-xl px-2 py-1.5 -mx-2 transition-colors', active && 'bg-line/25')}
          >
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span className="font-medium">{labels[key] ?? key}</span>
              <span className="text-muted whitespace-nowrap text-xs tabular-nums">
                {v.pedidos} · {formatMXN(v.monto)}
              </span>
            </div>
            <div className={cn('rounded-full bg-line/40 overflow-hidden transition-all', active ? 'h-2.5' : 'h-2')}>
              <motion.div
                className="h-full rounded-full bg-ink"
                initial={reduce ? { width: `${pct}%` } : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Heatmap día × hora ─────────────────────────────────────────

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function Heatmap({ matrix }: { matrix: NonNullable<MetricasResponse['heatmap']> }) {
  const max = Math.max(1, ...matrix.flat().map((c) => c.count));
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = (e: React.MouseEvent, dow: number, h: number, cell: { count: number; monto: number }) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: cell.count > 0
        ? `${DIAS[dow]} ${h}h · ${cell.count} pedidos · ${formatMXN(cell.monto)}`
        : `${DIAS[dow]} ${h}h · sin pedidos`,
    });
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="overflow-x-auto">
        <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="text-right pr-2 text-muted font-normal w-10"></th>
              {Array.from({ length: 24 }).map((_, h) => (
                <th key={h} className="text-center text-muted font-normal w-6">{h % 3 === 0 ? h : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, dow) => (
              <tr key={dow}>
                <td className="text-right pr-2 text-muted text-[11px] font-semibold">{DIAS[dow]}</td>
                {row.map((cell, h) => {
                  const intensity = cell.count / max;
                  const bg = intensity === 0 ? '#F3F4F6' : `rgba(242,106,31,${0.14 + intensity * 0.86})`;
                  return (
                    <td
                      key={h}
                      className="w-6 h-6 rounded-sm text-center align-middle cursor-default transition-transform hover:scale-110 hover:ring-2 hover:ring-[var(--ce-accent,#F26A1F)] hover:relative hover:z-10"
                      style={{ background: bg }}
                      onMouseEnter={(e) => show(e, dow, h, cell)}
                      onMouseMove={(e) => show(e, dow, h, cell)}
                      onMouseLeave={() => setTip(null)}
                    >
                      {cell.count > 0 && intensity > 0.45 && (
                        <span className={cn('font-bold', intensity > 0.7 ? 'text-white' : 'text-ink')}>{cell.count}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tip && (
        <div
          className="pointer-events-none absolute z-20 px-2.5 py-1.5 rounded-lg bg-ink text-white text-[11px] font-medium whitespace-nowrap shadow-lg -translate-x-1/2"
          style={{ left: tip.x, top: tip.y - 34 }}
        >
          {tip.text}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>menos</span>
        {[0.14, 0.35, 0.6, 0.85, 1].map((o) => (
          <span key={o} className="w-3 h-3 rounded-sm" style={{ background: o === 0.14 ? '#F3F4F6' : `rgba(242,106,31,${o})` }} />
        ))}
        <span>más</span>
      </div>
    </div>
  );
}

// ─── Low productos ──────────────────────────────────────────────

function LowProductos({ items }: { items: NonNullable<MetricasResponse['low_productos']> }) {
  if (items.length === 0) return <p className="text-sm text-muted">Aún no hay datos.</p>;
  return (
    <ul className="space-y-0.5">
      {items.map((p, i) => (
        <li key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 -mx-2 rounded-xl border-b border-line last:border-0 hover:bg-line/25 transition-colors">
          <span className="text-sm truncate">{p.producto_nombre}</span>
          <span className="text-xs text-muted tabular-nums shrink-0">
            {p.cantidad === 0 ? 'sin ventas' : `${p.cantidad} unidades`}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ─── Pedidos por estado (chips con count-up) ────────────────────

function EstadoChip({
  index, label, value, color,
}: { index: number; label: string; value: number; color?: { fg: string; bg: string } }) {
  const reduce = useReducedMotion();
  const c = color ?? { fg: '#6B6B6B', bg: 'rgba(0,0,0,0.05)' };
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0.2 : 0.28, delay: reduce ? 0 : index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-3 text-center border"
      style={{ background: c.bg, borderColor: `${c.fg}22` }}
    >
      <p className="text-[11px] font-medium truncate" style={{ color: c.fg }}>{label}</p>
      <CountUp value={value} format={(n) => Math.round(n).toString()}
        className="ce-display text-2xl font-bold tabular-nums block" />
    </motion.div>
  );
}

// ─── Utilidad neta (leyenda interactiva + tooltip) ──────────────

function LegendToggle({
  color, label, active, onToggle,
}: { color: string; label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-all min-h-[36px]',
        active ? 'border-line bg-white' : 'border-line bg-line/20 opacity-55',
      )}
    >
      <span className="w-3 h-3 rounded-full transition-transform" style={{ background: active ? color : 'transparent', border: `2px solid ${color}` }} />
      <span className={cn('font-medium', !active && 'line-through')}>{label}</span>
    </button>
  );
}

function UtilidadChart({
  serie, totalVentas, totalGastos,
}: { serie: UtilidadSerie[]; totalVentas: number; totalGastos: number }) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [show, setShow] = useState({ ventas: true, gastos: true });
  const [hover, setHover] = useState<number | null>(null);

  if (serie.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">Sin datos.</p>;
  }

  const visibles: number[] = [];
  serie.forEach((s) => {
    if (show.ventas) visibles.push(s.ventas_mxn);
    if (show.gastos) visibles.push(s.gastos_mxn);
  });
  const maxV = Math.max(...visibles, 1);
  const W = 600, H = 200, padX = 36, padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xFor = (i: number) => padX + (i / Math.max(serie.length - 1, 1)) * innerW;
  const yFor = (v: number) => padY + innerH - (v / maxV) * innerH;

  const lineFor = (key: 'ventas_mxn' | 'gastos_mxn') =>
    serie.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(s[key])}`).join(' ');

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((x - padX) / innerW) * (serie.length - 1));
    setHover(Math.max(0, Math.min(serie.length - 1, i)));
  };

  const hs = hover !== null ? serie[hover] : null;
  const hx = hover !== null ? xFor(hover) : 0;

  const boxW = 150, boxH = 62;
  let bx = hx + 10;
  if (bx + boxW > W - 4) bx = hx - 10 - boxW;
  if (bx < 4) bx = 4;
  const by = 6;

  return (
    <div>
      <div className="overflow-x-auto -mx-2 px-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H + 30}`}
          className="w-full min-w-[500px] h-auto touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t}
              x1={padX} x2={padX + innerW}
              y1={padY + innerH * (1 - t)} y2={padY + innerH * (1 - t)}
              stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
          ))}

          <AnimatePresence>
            {show.ventas && (
              <motion.path key="v" d={lineFor('ventas_mxn')} fill="none" stroke="#10B981" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: 'easeInOut' }} />
            )}
            {show.gastos && (
              <motion.path key="g" d={lineFor('gastos_mxn')} fill="none" stroke="#F26A1F" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.9, ease: 'easeInOut' }} />
            )}
          </AnimatePresence>

          {serie.map((s, i) => (
            <g key={s.mes}>
              {show.ventas && <circle cx={xFor(i)} cy={yFor(s.ventas_mxn)} r={hover === i ? 5 : 3.5} fill="white" stroke="#10B981" strokeWidth="2" />}
              {show.gastos && <circle cx={xFor(i)} cy={yFor(s.gastos_mxn)} r={hover === i ? 5 : 3.5} fill="white" stroke="#F26A1F" strokeWidth="2" />}
            </g>
          ))}

          {hs && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={padY} y2={padY + innerH}
                stroke="rgba(0,0,0,0.25)" strokeWidth="1" strokeDasharray="3 3" />
              <rect x={bx} y={by} width={boxW} height={boxH} rx="10" fill="white" stroke="rgba(0,0,0,0.08)" />
              <text x={bx + 10} y={by + 16} fontSize="11" fontWeight="700" fill="#1A1A1A" className="capitalize">{hs.label}</text>
              {show.ventas && <text x={bx + 10} y={by + 31} fontSize="10.5" fill="#10B981">Ventas · {formatMXN(hs.ventas_mxn)}</text>}
              {show.gastos && <text x={bx + 10} y={by + 44} fontSize="10.5" fill="#F26A1F">Gastos · {formatMXN(hs.gastos_mxn)}</text>}
              <text x={bx + 10} y={by + 57} fontSize="10.5" fontWeight="700" fill={hs.utilidad_mxn >= 0 ? '#059669' : '#DC2626'}>
                Utilidad · {formatMXN(hs.utilidad_mxn)}
              </text>
            </g>
          )}

          {serie.map((s, i) => (
            <text key={s.mes} x={xFor(i)} y={H + 16} textAnchor="middle" fontSize="10" fill="rgba(0,0,0,0.55)" className="capitalize">
              {s.label}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <LegendToggle color="#10B981" label={`Ventas — ${formatMXN(totalVentas)}`}
          active={show.ventas} onToggle={() => setShow((s) => ({ ...s, ventas: !s.ventas }))} />
        <LegendToggle color="#F26A1F" label={`Gastos — ${formatMXN(totalGastos)}`}
          active={show.gastos} onToggle={() => setShow((s) => ({ ...s, gastos: !s.gastos }))} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="text-muted">
              <th className="text-left font-medium py-1">Mes</th>
              <th className="text-right font-medium py-1">Ventas</th>
              <th className="text-right font-medium py-1">Gastos</th>
              <th className="text-right font-medium py-1">Utilidad</th>
              <th className="text-right font-medium py-1">Margen</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((s, i) => (
              <tr key={s.mes}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={cn('border-t border-line/40 transition-colors', hover === i && 'bg-line/25')}>
                <td className="py-1.5 capitalize">{s.label}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMXN(s.ventas_mxn)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMXN(s.gastos_mxn)}</td>
                <td className={cn('py-1.5 text-right tabular-nums font-semibold', s.utilidad_mxn >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                  {formatMXN(s.utilidad_mxn)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-muted">
                  {s.margen_pct === null ? '—' : `${s.margen_pct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
