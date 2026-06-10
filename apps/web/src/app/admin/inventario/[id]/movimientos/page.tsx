'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Ingrediente, MovimientoInventario, Paginated, Resource } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type TipoFilter = '' | 'entrada' | 'salida' | 'ajuste' | 'merma';

const TIPO_LABEL: Record<MovimientoInventario['tipo'], string> = {
  entrada: 'Entrada',
  salida:  'Salida',
  ajuste:  'Ajuste',
  merma:   'Merma',
};

const TIPO_COLOR: Record<MovimientoInventario['tipo'], string> = {
  entrada: 'bg-emerald-100 text-emerald-700',
  salida:  'bg-blue-100 text-blue-700',
  ajuste:  'bg-amber-100 text-amber-700',
  merma:   'bg-red-100 text-red-700',
};

export default function MovimientosPage() {
  const { id } = useParams<{ id: string }>();
  const [ing, setIng]       = useState<Ingrediente | null>(null);
  const [items, setItems]   = useState<MovimientoInventario[] | null>(null);
  const [meta, setMeta]     = useState<Paginated<MovimientoInventario>['meta'] | null>(null);
  const [page, setPage]     = useState(1);
  const [tipo, setTipo]     = useState<TipoFilter>('');
  const [desde, setDesde]   = useState('');
  const [hasta, setHasta]   = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<Resource<Ingrediente>>(`/ingredientes/${id}`).then(({ data }) => setIng(data.data));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setItems(null);
    api.get<Paginated<MovimientoInventario>>(`/ingredientes/${id}/movimientos`, {
      params: { page, tipo: tipo || undefined, desde: desde || undefined, hasta: hasta || undefined, per_page: 30 },
    }).then(({ data }) => {
      setItems(data.data);
      setMeta(data.meta);
    });
  }, [id, page, tipo, desde, hasta]);

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href="/admin/inventario" className="text-muted hover:underline">← Inventario</Link>
      </div>

      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-3xl md:text-4xl font-bold">
            {ing ? ing.nombre : 'Movimientos'}
          </h1>
          {ing && (
            <p className="text-muted text-sm mt-1">
              Stock actual: <strong className={cn(ing.bajo_stock && 'text-red-600')}>
                {ing.stock} {ing.unidad}
              </strong>
              {' '}· Mínimo: {ing.stock_minimo} {ing.unidad}
            </p>
          )}
        </div>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap text-sm">
        <select value={tipo} onChange={(e) => { setPage(1); setTipo(e.target.value as TipoFilter); }}
          className="px-3 py-2 border border-line rounded-xl bg-white">
          <option value="">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
          <option value="ajuste">Ajustes</option>
          <option value="merma">Mermas</option>
        </select>
        <input type="date" value={desde} onChange={(e) => { setPage(1); setDesde(e.target.value); }}
          className="px-3 py-2 border border-line rounded-xl bg-white" />
        <input type="date" value={hasta} onChange={(e) => { setPage(1); setHasta(e.target.value); }}
          className="px-3 py-2 border border-line rounded-xl bg-white" />
        {(tipo || desde || hasta) && (
          <Button variant="ghost" size="sm" onClick={() => { setTipo(''); setDesde(''); setHasta(''); setPage(1); }}>
            Limpiar
          </Button>
        )}
      </div>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          Sin movimientos con estos filtros.
        </div>
      ) : (
        <>
          {/* ─── Móvil: cards ─── */}
          <div className="md:hidden space-y-2">
            {items.map((m) => {
              const sign = m.cantidad > 0 ? '+' : '';
              const positive = m.cantidad > 0;
              return (
                <div key={m.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TIPO_COLOR[m.tipo])}>
                      {TIPO_LABEL[m.tipo]}
                    </span>
                    <span className="text-xs text-muted">{new Date(m.created_at).toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className={cn('text-lg font-bold font-mono', positive ? 'text-emerald-600' : 'text-red-600')}>
                      {sign}{m.cantidad} {ing?.unidad}
                    </span>
                    <span className="text-sm text-muted">
                      → <strong className="text-ink">{m.stock_resultante}</strong>
                    </span>
                  </div>
                  {(m.referencia || m.motivo) && (
                    <div className="mt-2 pt-2 border-t border-line text-xs text-muted space-y-0.5">
                      {m.referencia && <p className="font-mono truncate">{m.referencia}</p>}
                      {m.motivo && <p className="truncate">{m.motivo}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Desktop: tabla ─── */}
          <div className="hidden md:block rounded-2xl border border-line bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-line/30 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Cantidad</th>
                  <th className="text-right px-4 py-3">Stock tras</th>
                  <th className="text-left px-4 py-3">Referencia</th>
                  <th className="text-left px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => {
                  const sign = m.cantidad > 0 ? '+' : '';
                  const positive = m.cantidad > 0;
                  return (
                    <tr key={m.id} className="border-t border-line">
                      <td className="px-4 py-3 text-xs">{new Date(m.created_at).toLocaleString('es-MX')}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TIPO_COLOR[m.tipo])}>
                          {TIPO_LABEL[m.tipo]}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-mono', positive ? 'text-emerald-600' : 'text-red-600')}>
                        {sign}{m.cantidad} {ing?.unidad}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{m.stock_resultante}</td>
                      <td className="px-4 py-3 text-xs text-muted">{m.referencia ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted truncate max-w-[200px]">{m.motivo ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted">{meta.from}–{meta.to} de {meta.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
            <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(p => p + 1)}>›</Button>
          </div>
        </div>
      )}
    </div>
  );
}
