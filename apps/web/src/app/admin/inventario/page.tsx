'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Ingrediente, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Select, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const UNIDADES = ['pz', 'kg', 'g', 'l', 'ml'] as const;

export default function InventarioPage() {
  const [items, setItems] = useState<Ingrediente[] | null>(null);
  const [filterBajo, setFilterBajo] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [creating, setCreating] = useState(false);
  const [ajusting, setAjusting] = useState<Ingrediente | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<{ data: Ingrediente[] }>('/ingredientes', {
      params: { bajo_stock: filterBajo || undefined },
    });
    setItems(data.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filterBajo]);

  const handleDelete = async (i: Ingrediente) => {
    if (!confirm(`¿Eliminar "${i.nombre}"?`)) return;
    try {
      await api.delete(`/ingredientes/${i.id}`);
      toast.success('Ingrediente eliminado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <header className="flex items-start justify-between mb-4 md:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Inventario</h1>
          <p className="text-muted text-sm mt-1">Stock por ingrediente. Los pedidos descuentan automáticamente vía recetas.</p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant={filterBajo ? 'primary' : 'secondary'}
            onClick={() => setFilterBajo(!filterBajo)}
            className="flex-1 sm:flex-none"
          >
            Bajo stock
          </Button>
          <Link
            href="/admin/compras"
            className="inline-flex items-center justify-center px-4 h-10 text-sm font-medium rounded-xl bg-white border border-line hover:bg-line/30 flex-1 sm:flex-none"
          >
            🧾 Compras
          </Link>
          <Button onClick={() => setCreating(true)} className="flex-1 sm:flex-none">+ Ingrediente</Button>
        </div>
      </header>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          {filterBajo ? 'No hay ingredientes con stock bajo. 🎉' : 'No tienes ingredientes registrados.'}
        </div>
      ) : (
        <>
          {/* ─── Móvil: cards ─── */}
          <div className="md:hidden space-y-2">
            {items.map((i) => (
              <div key={i.id} className={cn(
                'rounded-2xl border bg-white p-4',
                i.bajo_stock ? 'border-red-300' : 'border-line',
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{i.nombre}</p>
                    <p className={cn(
                      'text-lg font-bold mt-1',
                      i.bajo_stock ? 'text-red-600' : 'text-ink',
                    )}>
                      {i.stock} <span className="text-sm text-muted">{i.unidad}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      mín {i.stock_minimo} {i.unidad} · costo ${i.costo_unitario.toFixed(2)}
                    </p>
                  </div>
                  {i.bajo_stock && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap">
                      ⚠️ bajo
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-line">
                  <Link
                    href={`/admin/inventario/${i.id}/movimientos`}
                    className="text-center text-xs py-2 rounded-lg hover:bg-line/40"
                  >
                    Historial
                  </Link>
                  <button onClick={() => setAjusting(i)} className="text-center text-xs py-2 rounded-lg hover:bg-line/40">Ajustar</button>
                  <button onClick={() => setEditing(i)} className="text-center text-xs py-2 rounded-lg hover:bg-line/40">Editar</button>
                  <button onClick={() => handleDelete(i)} className="text-center text-xs py-2 rounded-lg hover:bg-line/40 text-red-600">Borrar</button>
                </div>
              </div>
            ))}
          </div>

          {/* ─── Desktop: tabla ─── */}
          <div className="hidden md:block rounded-2xl border border-line bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-line/30 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-right px-4 py-3">Mínimo</th>
                  <th className="text-right px-4 py-3">Costo</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{i.nombre}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(i.bajo_stock && 'text-red-600 font-bold')}>
                        {i.stock} {i.unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{i.stock_minimo} {i.unidad}</td>
                    <td className="px-4 py-3 text-right text-muted">${i.costo_unitario.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {i.bajo_stock ? '⚠️ bajo' : '✓'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/inventario/${i.id}/movimientos`}
                        className="inline-flex items-center justify-center px-3 h-8 text-sm rounded-lg hover:bg-line/40"
                      >
                        Historial
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setAjusting(i)}>Ajustar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(i)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(i)}>Borrar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <IngredienteModal
        open={creating || !!editing}
        ingrediente={editing ?? undefined}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
      />
      <AjusteModal
        open={!!ajusting}
        ingrediente={ajusting ?? undefined}
        onClose={() => setAjusting(null)}
        onSaved={() => { setAjusting(null); refresh(); }}
      />
    </div>
  );
}

function IngredienteModal({
  open, onClose, onSaved, ingrediente,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ingrediente?: Ingrediente;
}) {
  const [nombre, setNombre] = useState('');
  const [stock, setStock] = useState(0);
  const [stockMin, setStockMin] = useState(0);
  const [unidad, setUnidad] = useState<typeof UNIDADES[number]>('pz');
  const [costo, setCosto] = useState(0);
  const [activo, setActivo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(ingrediente?.nombre ?? '');
    setStock(ingrediente?.stock ?? 0);
    setStockMin(ingrediente?.stock_minimo ?? 0);
    setUnidad(ingrediente?.unidad ?? 'pz');
    setCosto(ingrediente?.costo_unitario ?? 0);
    setActivo(ingrediente?.activo ?? true);
    setErrors({});
  }, [open, ingrediente]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        nombre, stock, stock_minimo: stockMin, unidad, costo_unitario: costo, activo,
      };
      if (ingrediente) {
        await api.patch<Resource<Ingrediente>>(`/ingredientes/${ingrediente.id}`, payload);
        toast.success('Ingrediente actualizado');
      } else {
        await api.post<Resource<Ingrediente>>('/ingredientes', payload);
        toast.success('Ingrediente creado');
      }
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={ingrediente ? 'Editar ingrediente' : 'Nuevo ingrediente'}>
      <form onSubmit={onSubmit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errors.nombre} required maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock actual" type="number" step="0.001" value={stock} onChange={(e) => setStock(Number(e.target.value))} error={errors.stock} required />
          <Select label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value as any)} error={errors.unidad}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock mínimo" type="number" step="0.001" value={stockMin} onChange={(e) => setStockMin(Number(e.target.value))} error={errors.stock_minimo} hint="Para alerta de bajo stock" />
          <Field label="Costo unitario (MXN)" type="number" step="0.01" value={costo} onChange={(e) => setCosto(Number(e.target.value))} error={errors.costo_unitario} />
        </div>
        <Switch label="Activo" checked={activo} onChange={setActivo} />
        <div className="flex gap-2 justify-end mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteModal({
  open, onClose, onSaved, ingrediente,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  ingrediente?: Ingrediente;
}) {
  const [tipo, setTipo] = useState<'entrada' | 'ajuste' | 'merma'>('entrada');
  const [cantidad, setCantidad] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTipo('entrada'); setCantidad(0); setMotivo('');
  }, [open]);

  if (!ingrediente) return null;

  const cantidadFirmada = tipo === 'merma' ? -Math.abs(cantidad) : Math.abs(cantidad);
  const nuevoStock = Math.max(0, ingrediente.stock + cantidadFirmada);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cantidad === 0) return;
    setSaving(true);
    try {
      await api.post(`/ingredientes/${ingrediente.id}/ajuste`, {
        tipo,
        cantidad: cantidadFirmada,
        motivo: motivo || null,
      });
      toast.success('Stock ajustado');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo ajustar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Ajustar stock — ${ingrediente.nombre}`}>
      <form onSubmit={onSubmit}>
        <p className="text-sm text-muted mb-3">
          Stock actual: <strong>{ingrediente.stock} {ingrediente.unidad}</strong>
        </p>

        <Select label="Tipo de movimiento" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
          <option value="entrada">Entrada (suma)</option>
          <option value="merma">Merma (resta)</option>
          <option value="ajuste">Ajuste manual</option>
        </Select>

        <Field
          label={`Cantidad en ${ingrediente.unidad}`}
          type="number"
          step="0.001"
          min={0}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          required
        />

        <Field label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} />

        <div className="rounded-xl bg-line/30 px-4 py-3 mb-3 text-sm">
          Nuevo stock: <strong>{nuevoStock} {ingrediente.unidad}</strong>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={cantidad === 0}>Confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}
