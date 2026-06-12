'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Compra, Ingrediente, Paginated, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatMXN } from '@/lib/utils';

type EstadoFilter = 'todos' | 'registrada' | 'anulada';

export default function ComprasPage() {
  const [items, setItems]   = useState<Compra[] | null>(null);
  const [meta, setMeta]     = useState<Paginated<Compra>['meta'] | null>(null);
  const [page, setPage]     = useState(1);
  const [estado, setEstado] = useState<EstadoFilter>('todos');
  const [trashed, setTrashed] = useState<'' | 'only' | 'with'>('');
  const [creating, setCreating] = useState(false);
  const [detalle, setDetalle]   = useState<Compra | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<Paginated<Compra>>('/compras', {
      params: {
        page,
        estado: estado !== 'todos' ? estado : undefined,
        trashed: trashed || undefined,
        per_page: 20,
      },
    });
    setItems(data.data);
    setMeta(data.meta);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [page, estado, trashed]);

  const restaurar = async (c: Compra) => {
    try {
      await api.post(`/compras/${c.id}/restore`);
      toast.success(`Compra ${c.codigo} restaurada`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo restaurar');
    }
  };

  const anular = async (c: Compra) => {
    if (!confirm(`¿Anular compra ${c.codigo}? Se revertirá el stock.`)) return;
    try {
      await api.delete(`/compras/${c.id}`);
      toast.success(`Compra ${c.codigo} anulada`);
      refresh();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const faltantes = err.response.data.faltantes ?? [];
        const lista = faltantes.map((f: any) =>
          `${f.ingrediente}: compraste ${f.comprado}${f.unidad} pero quedan ${f.stock_actual}${f.unidad}`,
        ).join('; ');
        toast.error(`No se puede anular — ya se consumió parte. ${lista}`);
      } else {
        toast.error(err?.response?.data?.message ?? 'No se pudo anular');
      }
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-3xl md:text-4xl font-bold">Compras</h1>
          <p className="text-muted text-sm mt-1">
            Registra la mercancía que recibes del proveedor.
            Aumenta stock + actualiza costo promedio automáticamente.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nueva compra</Button>
      </header>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={estado}
          onChange={(e) => { setPage(1); setEstado(e.target.value as EstadoFilter); }}
          className="px-3 py-2 border border-line rounded-xl bg-white text-sm"
        >
          <option value="todos">Todas</option>
          <option value="registrada">Registradas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          Sin compras registradas. Click <strong>+ Nueva compra</strong> para empezar.
        </div>
      ) : (
        <>
          {/* ─── Móvil: cards ─── */}
          <div className="md:hidden space-y-2">
            {items.map((c) => (
              <div key={c.id} className={cn(
                'rounded-2xl border border-line bg-white p-4',
                c.estado === 'anulada' && 'opacity-60',
              )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-mono text-xs text-muted">{c.codigo}</p>
                    <p className="font-medium truncate">{c.proveedor ?? 'Sin proveedor'}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase whitespace-nowrap',
                    c.estado === 'registrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                  )}>
                    {c.estado}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted">{new Date(c.fecha).toLocaleDateString('es-MX')}</span>
                  <span className="ce-display font-bold text-xl">{formatMXN(c.total)}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-3 pt-3 border-t border-line">
                  <button onClick={() => setDetalle(c)} className="text-center text-xs py-2 rounded-lg hover:bg-line/40">Ver</button>
                  {c.estado === 'registrada' ? (
                    <button onClick={() => anular(c)} className="text-center text-xs py-2 rounded-lg hover:bg-line/40 text-red-600">Anular</button>
                  ) : <span />}
                </div>
              </div>
            ))}
          </div>

          {/* ─── Desktop: tabla ─── */}
          <div className="hidden md:block rounded-2xl border border-line bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-line/30 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className={cn('border-t border-line hover:bg-line/20', c.estado === 'anulada' && 'opacity-60')}>
                    <td className="px-4 py-3 font-mono text-xs">{c.codigo}</td>
                    <td className="px-4 py-3">{new Date(c.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-4 py-3">{c.proveedor ?? <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatMXN(c.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        c.estado === 'registrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                      )}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setDetalle(c)}>Ver</Button>
                      {c.estado === 'registrada' && (
                        <Button variant="ghost" size="sm" onClick={() => anular(c)}>Anular</Button>
                      )}
                    </td>
                  </tr>
                ))}
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

      <CompraModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); refresh(); }}
      />

      <DetalleModal
        open={!!detalle}
        compra={detalle ?? undefined}
        onClose={() => setDetalle(null)}
      />
    </div>
  );
}

// ─── Modal: registrar nueva compra ────────────────────────────
interface LineaForm {
  ingrediente_id: number | null;
  cantidad: number;
  costo_unitario: number;
}

function CompraModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [proveedor, setProveedor] = useState('');
  const [factura, setFactura]     = useState('');
  const [fecha, setFecha]         = useState(() => new Date().toISOString().slice(0, 10));
  const [impuestos, setImpuestos] = useState(0);
  const [notas, setNotas]         = useState('');
  const [lineas, setLineas]       = useState<LineaForm[]>([]);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!open) return;
    setProveedor(''); setFactura(''); setFecha(new Date().toISOString().slice(0, 10));
    setImpuestos(0); setNotas(''); setLineas([]); setErrors({});
    api.get<{ data: Ingrediente[] }>('/ingredientes').then(({ data }) => setIngredientes(data.data));
  }, [open]);

  const ingMap = new Map(ingredientes.map((i) => [i.id, i]));

  const addLine = () => {
    const usados = new Set(lineas.map((l) => l.ingrediente_id));
    const libre = ingredientes.find((i) => !usados.has(i.id));
    setLineas([...lineas, {
      ingrediente_id: libre?.id ?? null,
      cantidad: 1,
      costo_unitario: libre?.costo_unitario ?? 0,
    }]);
  };

  const updateLinea = (idx: number, patch: Partial<LineaForm>) => {
    setLineas(lineas.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };
  const removeLinea = (idx: number) => setLineas(lineas.filter((_, i) => i !== idx));

  const subtotal = useMemo(
    () => lineas.reduce((s, l) => s + (l.cantidad ?? 0) * (l.costo_unitario ?? 0), 0),
    [lineas],
  );
  const total = subtotal + (impuestos || 0);

  const onSave = async () => {
    setErrors({}); setSaving(true);
    try {
      const items = lineas
        .filter((l) => l.ingrediente_id && l.cantidad > 0 && l.costo_unitario >= 0)
        .map((l) => ({
          ingrediente_id: l.ingrediente_id!,
          cantidad:       l.cantidad,
          costo_unitario: l.costo_unitario,
        }));

      if (items.length === 0) {
        toast.error('Agrega al menos un ingrediente.');
        return;
      }

      await api.post<Resource<Compra>>('/compras', {
        proveedor:          proveedor || null,
        referencia_factura: factura  || null,
        fecha,
        impuestos:          impuestos || 0,
        notas:              notas || null,
        items,
      });
      toast.success('Compra registrada — stock actualizado');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      toast.error(err?.response?.data?.message ?? 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar compra" size="lg">
      {ingredientes.length === 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
          <p className="font-medium mb-2">Necesitas ingredientes primero</p>
          <p className="text-muted mb-3">
            Crea al menos un ingrediente en <strong>Inventario</strong> antes de registrar compras.
          </p>
          <a href="/admin/inventario" className="inline-block px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-medium">
            Ir a Inventario →
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Field label="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} maxLength={150} error={errors.proveedor} />
            <Field label="# Factura / referencia" value={factura} onChange={(e) => setFactura(e.target.value)} maxLength={60} error={errors.referencia_factura} />
            <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} error={errors.fecha} />
          </div>

          <h3 className="ce-display font-bold mb-2">Ingredientes recibidos</h3>
          <ul className="divide-y divide-line border border-line rounded-xl mb-3 overflow-hidden">
            {lineas.map((l, idx) => {
              const ing = l.ingrediente_id ? ingMap.get(l.ingrediente_id) : null;
              const subtotalLinea = l.cantidad * l.costo_unitario;
              return (
                <li key={idx} className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={l.ingrediente_id ?? ''}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const found = ingMap.get(id);
                        updateLinea(idx, { ingrediente_id: id, costo_unitario: l.costo_unitario || (found?.costo_unitario ?? 0) });
                      }}
                      className="flex-1 min-w-[180px] px-2 py-1.5 border border-line rounded-lg bg-white"
                    >
                      <option value="">Selecciona…</option>
                      {ingredientes.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} ({i.unidad}) · stock {i.stock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.001" min={0.001}
                      value={l.cantidad}
                      onChange={(e) => updateLinea(idx, { cantidad: Number(e.target.value) })}
                      className="w-24 px-2 py-1.5 border border-line rounded-lg bg-white text-right"
                      placeholder="Cant."
                    />
                    <span className="text-xs text-muted w-8">{ing?.unidad ?? ''}</span>
                    <span className="text-xs text-muted">×</span>
                    <input
                      type="number" step="0.01" min={0}
                      value={l.costo_unitario}
                      onChange={(e) => updateLinea(idx, { costo_unitario: Number(e.target.value) })}
                      className="w-28 px-2 py-1.5 border border-line rounded-lg bg-white text-right"
                      placeholder="$/unidad"
                    />
                    <span className="ml-auto font-mono text-sm">{formatMXN(subtotalLinea)}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeLinea(idx)} aria-label="Quitar">✕</Button>
                  </div>
                  {ing && l.costo_unitario > 0 && Number(ing.costo_unitario) > 0 && (
                    <div className="mt-1.5 ml-1 text-xs text-muted">
                      Costo actual del ingrediente: ${Number(ing.costo_unitario).toFixed(2)}{' '}
                      {l.costo_unitario > Number(ing.costo_unitario)
                        ? <span className="text-amber-600">— subió ↑</span>
                        : l.costo_unitario < Number(ing.costo_unitario)
                          ? <span className="text-emerald-600">— bajó ↓</span>
                          : null}
                    </div>
                  )}
                </li>
              );
            })}
            {lineas.length === 0 && (
              <li className="p-4 text-center text-sm text-muted">
                Agrega ingredientes recibidos del proveedor.
              </li>
            )}
          </ul>

          <Button variant="secondary" size="sm" onClick={addLine}
            disabled={lineas.length >= ingredientes.length}>
            + Agregar ingrediente
          </Button>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Textarea label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} />
            <div>
              <Field label="Impuestos (IVA, opcional)" type="number" step="0.01" min={0} value={impuestos} onChange={(e) => setImpuestos(Number(e.target.value))} />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-line/20 p-4 mb-4 grid grid-cols-2 text-sm">
            <span>Subtotal</span><span className="text-right font-mono">{formatMXN(subtotal)}</span>
            <span>Impuestos</span><span className="text-right font-mono">{formatMXN(impuestos)}</span>
            <span className="font-bold pt-2 border-t border-line mt-2">Total</span>
            <span className="text-right font-mono font-bold pt-2 border-t border-line mt-2">{formatMXN(total)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave} loading={saving} disabled={lineas.length === 0}>
              Registrar compra
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Modal: detalle / ticket de compra ────────────────────────
function DetalleModal({
  open, onClose, compra,
}: { open: boolean; onClose: () => void; compra?: Compra }) {
  const [full, setFull] = useState<Compra | null>(null);

  useEffect(() => {
    if (!open || !compra) return;
    setFull(null);
    api.get<Resource<Compra>>(`/compras/${compra.id}`).then(({ data }) => setFull(data.data));
  }, [open, compra]);

  if (!compra) return null;
  const c = full ?? compra;

  return (
    <Modal open={open} onClose={onClose} title={`Compra ${c.codigo}`} size="md">
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-xs uppercase text-muted">Proveedor</p>
          <p className="font-medium">{c.proveedor ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Fecha</p>
          <p>{new Date(c.fecha).toLocaleDateString('es-MX')}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Factura</p>
          <p>{c.referencia_factura ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Estado</p>
          <p className={cn(c.estado === 'anulada' ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium')}>
            {c.estado}
          </p>
        </div>
      </div>

      <h3 className="ce-display font-bold mb-2">Ingredientes</h3>
      <ul className="divide-y divide-line border border-line rounded-xl mb-4">
        {!full ? (
          <li className="p-4"><Skeleton className="h-4" /></li>
        ) : (c.detalles ?? []).map((d) => (
          <li key={d.id} className="p-3 text-sm flex items-center gap-2">
            <span className="flex-1 truncate">{d.ingrediente?.nombre ?? '—'}</span>
            <span className="text-muted">{d.cantidad} {d.ingrediente?.unidad}</span>
            <span className="text-muted">×</span>
            <span className="font-mono">{formatMXN(d.costo_unitario)}</span>
            <span className="ml-auto font-mono font-bold">{formatMXN(d.subtotal)}</span>
          </li>
        ))}
      </ul>

      {c.notas && (
        <div className="mb-4 p-3 rounded-xl bg-line/20 text-sm">
          <p className="text-xs text-muted uppercase mb-1">Notas</p>
          <p>{c.notas}</p>
        </div>
      )}

      <div className="rounded-xl border border-line bg-line/20 p-4 grid grid-cols-2 text-sm">
        <span>Subtotal</span><span className="text-right font-mono">{formatMXN(c.subtotal)}</span>
        <span>Impuestos</span><span className="text-right font-mono">{formatMXN(c.impuestos)}</span>
        <span className="font-bold pt-2 border-t border-line mt-2">Total</span>
        <span className="text-right font-mono font-bold pt-2 border-t border-line mt-2">{formatMXN(c.total)}</span>
      </div>
    </Modal>
  );
}
