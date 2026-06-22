'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { MetricasResponse } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn, formatMXN } from '@/lib/utils';

type Preset = 'hoy' | 'ayer' | '7d' | '30d' | 'mes' | 'custom';

const ESTADOS_LABEL: Record<string, string> = {
  nuevo: 'Nuevos', confirmado: 'Confirmados', preparando: 'Preparando',
  listo: 'Listos', en_camino: 'En camino', entregado: 'Entregados', cancelado: 'Cancelados',
};

const ENTREGA_LABEL: Record<string, string> = {
  pickup: 'Recoger', delivery: 'A domicilio', sucursal: 'Sucursal',
};

const PAGO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta_entrega: 'Tarjeta a entrega',
  tarjeta_tpv: 'Tarjeta TPV', transferencia: 'Transferencia',
};

export default function MetricasPage() {
  const [data, setData] = useState<MetricasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('30d');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params = preset === 'custom'
        ? { desde: desde || undefined, hasta: hasta || undefined }
        : { preset };
      const { data: r } = await api.get<{ data: MetricasResponse }>('/metricas', { params });
      setData(r.data);
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

      {/* Filtros de rango */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['hoy', 'ayer', '7d', '30d', 'mes'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={cn(
              'px-3 py-2 rounded-xl text-sm border tap-target',
              preset === p ? 'bg-ink text-white border-transparent' : 'bg-white border-line',
            )}
          >
            {{ hoy: 'Hoy', ayer: 'Ayer', '7d': '7 días', '30d': '30 días', mes: 'Este mes' }[p]}
          </button>
        ))}
        <button
          onClick={() => setPreset('custom')}
          className={cn(
            'px-3 py-2 rounded-xl text-sm border tap-target',
            preset === 'custom' ? 'bg-ink text-white border-transparent' : 'bg-white border-line',
          )}
        >
          Custom
        </button>
        {preset === 'custom' && (
          <>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-2 border border-line rounded-xl bg-white text-sm min-h-[44px]" />
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-2 border border-line rounded-xl bg-white text-sm min-h-[44px]" />
          </>
        )}
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Kpi title="Ventas"           value={formatMXN(data.resumen.ventas_total)}
              hint={`${data.resumen.pedidos} pedidos`} accent />
            <Kpi title="Ticket promedio"  value={formatMXN(data.resumen.ticket_promedio)}
              hint={data.rango.dias === 1 ? 'hoy' : `${data.rango.dias} días`} />
            <Kpi title="Margen aprox"     value={formatMXN(data.resumen.margen_aprox)}
              hint={`${data.resumen.margen_pct}% · compras ${formatMXN(data.resumen.costo_compras)}`}
              tone={data.resumen.margen_aprox >= 0 ? 'pos' : 'neg'} />
            <Kpi title="Bajo stock"       value={data.resumen.bajo_stock.toString()}
              hint="ingredientes" tone={data.resumen.bajo_stock > 0 ? 'warn' : 'neutral'} />
          </section>

          {/* Gráfica de ventas diarias */}
          <section className="rounded-2xl border border-line bg-white p-4 mb-4">
            <h2 className="ce-display font-bold mb-3">Ventas por día</h2>
            <SerieChart serie={data.serie_diaria} />
          </section>

          {/* Heatmap día × hora */}
          {data.heatmap && (
            <section className="rounded-2xl border border-line bg-white p-4 mb-4">
              <h2 className="ce-display font-bold mb-1">¿A qué hora te piden más?</h2>
              <p className="text-xs text-muted mb-3">Filas = día de la semana. Columnas = hora del día. Color más oscuro = más pedidos.</p>
              <Heatmap matrix={data.heatmap} />
            </section>
          )}

          {/* Top + Low productos */}
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

          {/* Top productos + métodos */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <h2 className="ce-display font-bold mb-3">Top productos</h2>
              <TopProductos items={data.top_productos} />
            </div>

            <div className="rounded-2xl border border-line bg-white p-4">
              <h2 className="ce-display font-bold mb-3">Por método de entrega</h2>
              <DistribucionList map={data.por_entrega} labels={ENTREGA_LABEL}
                total={data.resumen.pedidos} />

              <h2 className="ce-display font-bold mt-5 mb-3">Por método de pago</h2>
              <DistribucionList map={data.por_pago} labels={PAGO_LABEL}
                total={data.resumen.pedidos} />
            </div>
          </section>

          {/* Pedidos por estado */}
          <section className="rounded-2xl border border-line bg-white p-4">
            <h2 className="ce-display font-bold mb-3">Pedidos por estado</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {Object.entries(data.por_estado).length === 0 ? (
                <p className="text-sm text-muted col-span-full">Sin pedidos en el rango.</p>
              ) : Object.entries(ESTADOS_LABEL).map(([key, label]) => {
                const v = (data.por_estado as any)[key] ?? 0;
                return (
                  <div key={key} className="rounded-xl bg-line/20 p-3 text-center">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="ce-display text-2xl font-bold">{v}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ─────────────────────────────────────

function Kpi({
  title, value, hint, accent, tone,
}: { title: string; value: string; hint?: string; accent?: boolean; tone?: 'pos'|'neg'|'warn'|'neutral' }) {
  const toneClass = tone === 'pos'  ? 'text-emerald-600'
                  : tone === 'neg'  ? 'text-red-600'
                  : tone === 'warn' ? 'text-amber-600'
                  : '';
  return (
    <div className={cn(
      'rounded-2xl border bg-white p-4',
      accent ? 'border-ink' : 'border-line',
    )}>
      <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
      <p className={cn('ce-display text-xl md:text-2xl font-bold mt-1 truncate', toneClass)}>{value}</p>
      {hint && <p className="text-xs text-muted mt-1 truncate">{hint}</p>}
    </div>
  );
}

function SerieChart({ serie }: { serie: MetricasResponse['serie_diaria'] }) {
  if (serie.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">Sin datos para el rango.</p>;
  }

  const maxV = Math.max(...serie.map((s) => s.ventas), 1);
  const W = 600;
  const H = 180;
  const padX = 30, padY = 10;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const xFor = (i: number) => padX + (i / Math.max(serie.length - 1, 1)) * innerW;
  const yFor = (v: number) => padY + innerH - (v / maxV) * innerH;

  const linePath = serie
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(s.ventas)}`)
    .join(' ');
  const areaPath = `${linePath} L ${xFor(serie.length - 1)} ${padY + innerH} L ${xFor(0)} ${padY + innerH} Z`;

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full min-w-[500px] h-auto">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t}
            x1={padX} x2={padX + innerW}
            y1={padY + innerH * (1 - t)} y2={padY + innerH * (1 - t)}
            stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
        ))}
        {/* Área */}
        <path d={areaPath} fill="var(--ce-accent, #F26A1F)" fillOpacity="0.15" />
        {/* Línea */}
        <path d={linePath} fill="none" stroke="var(--ce-accent, #F26A1F)" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
        {/* Puntos */}
        {serie.map((s, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(s.ventas)} r="3"
              fill="white" stroke="var(--ce-accent, #F26A1F)" strokeWidth="2" />
            <title>{`${s.fecha}: ${s.pedidos} pedidos · $${s.ventas.toFixed(2)}`}</title>
          </g>
        ))}
        {/* Labels eje X (cada 1/3 de los días para no saturar) */}
        {serie.length > 0 && [0, Math.floor(serie.length * 0.5), serie.length - 1].map((i) => {
          if (i < 0 || i >= serie.length) return null;
          const d = new Date(serie[i].fecha + 'T12:00:00');
          return (
            <text key={i} x={xFor(i)} y={H + 18} fontSize="10" fill="#6B6B6B" textAnchor="middle">
              {d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function TopProductos({ items }: { items: MetricasResponse['top_productos'] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted py-6 text-center">Sin ventas en el rango.</p>;
  }
  const maxQty = Math.max(...items.map((i) => i.cantidad));
  return (
    <ul className="space-y-2">
      {items.map((p, i) => (
        <li key={p.producto_nombre + i}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span className="truncate font-medium">{p.producto_nombre}</span>
            <span className="text-muted whitespace-nowrap">
              {p.cantidad} · {formatMXN(p.ingresos)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-line/40 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(p.cantidad / maxQty) * 100}%`,
                background: 'var(--ce-accent, #F26A1F)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DistribucionList({
  map, labels, total,
}: {
  map: Record<string, { pedidos: number; monto: number }>;
  labels: Record<string, string>;
  total: number;
}) {
  const entries = Object.entries(map);
  if (entries.length === 0 || total === 0) {
    return <p className="text-sm text-muted">Sin datos.</p>;
  }
  return (
    <ul className="space-y-2">
      {entries.map(([key, v]) => {
        const pct = total > 0 ? (v.pedidos / total) * 100 : 0;
        return (
          <li key={key}>
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span>{labels[key] ?? key}</span>
              <span className="text-muted whitespace-nowrap">
                {v.pedidos} · {formatMXN(v.monto)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-line/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-ink"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ─────────── Heatmap día × hora ─────────── */
function Heatmap({ matrix }: { matrix: NonNullable<MetricasResponse['heatmap']> }) {
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const max = Math.max(1, ...matrix.flat().map((c) => c.count));

  return (
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
                const bg = intensity === 0
                  ? '#F3F4F6'
                  : `rgba(255, 45, 45, ${0.15 + intensity * 0.85})`;
                return (
                  <td
                    key={h}
                    className="w-6 h-6 rounded-sm text-center align-middle cursor-default"
                    style={{ background: bg }}
                    title={cell.count > 0 ? `${DIAS[dow]} ${h}h — ${cell.count} pedidos, $${cell.monto.toFixed(0)}` : `${DIAS[dow]} ${h}h — sin pedidos`}
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
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
        <span>menos</span>
        <span className="w-3 h-3 rounded-sm" style={{ background: '#F3F4F6' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,45,45,0.3)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,45,45,0.55)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,45,45,0.8)' }} />
        <span className="w-3 h-3 rounded-sm" style={{ background: 'rgba(255,45,45,1)' }} />
        <span>más</span>
      </div>
    </div>
  );
}

function LowProductos({ items }: { items: NonNullable<MetricasResponse['low_productos']> }) {
  if (items.length === 0) return <p className="text-sm text-muted">Aún no hay datos.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((p, i) => (
        <li key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-line last:border-0">
          <span className="text-sm truncate">{p.producto_nombre}</span>
          <span className="text-xs text-muted tabular-nums shrink-0">
            {p.cantidad === 0 ? 'sin ventas' : `${p.cantidad} unidades`}
          </span>
        </li>
      ))}
    </ul>
  );
}
