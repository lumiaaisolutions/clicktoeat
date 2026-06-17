'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Select, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Cupon {
  id: number;
  codigo: string;
  tipo: 'percent' | 'fixed';
  valor: string;
  min_subtotal: string;
  max_descuento: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  max_usos: number | null;
  usos_actuales: number;
  activo: boolean;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  dias_semana?: string[] | null;
  destacado_en_landing?: boolean;
  productos_sugeridos?: number[] | null;
}

interface ProductoMin { id: number; nombre: string; precio: number | string }

const DIAS = [
  { id: 'mon', label: 'L' },
  { id: 'tue', label: 'M' },
  { id: 'wed', label: 'X' },
  { id: 'thu', label: 'J' },
  { id: 'fri', label: 'V' },
  { id: 'sat', label: 'S' },
  { id: 'sun', label: 'D' },
];

export default function CuponesPage() {
  const [items, setItems] = useState<Cupon[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing]   = useState<Cupon | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<{ data: Cupon[] }>('/cupones');
    setItems(data.data);
  };

  useEffect(() => { refresh(); }, []);

  const toggle = async (c: Cupon) => {
    try { await api.post(`/cupones/${c.id}/toggle`); refresh(); }
    catch { toast.error('No se pudo actualizar'); }
  };

  const remove = async (c: Cupon) => {
    if (!confirm(`¿Eliminar cupón "${c.codigo}"?`)) return;
    try { await api.delete(`/cupones/${c.id}`); toast.success('Cupón eliminado'); refresh(); }
    catch { toast.error('No se pudo eliminar'); }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Cupones"
        kickerIcon="sparkles"
        title="Descuentos"
        titleAccent="para tus clientes."
        description="Crea códigos como BIENVENIDO o VERANO20. Tus clientes los aplican en el carrito antes de enviar el pedido."
        actions={<Button onClick={() => setCreating(true)}>+ Nuevo cupón</Button>}
      />

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="sparkles" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Aún no creas cupones</p>
          <p className="text-sm text-muted mt-1">Atrae clientes con un descuento en su primera compra.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((c) => {
              const usosTxt = c.max_usos === null ? `${c.usos_actuales} usos` : `${c.usos_actuales}/${c.max_usos}`;
              const valorTxt = c.tipo === 'percent' ? `${parseFloat(c.valor)}%` : `$${parseFloat(c.valor).toFixed(0)}`;
              return (
                <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 grid place-items-center shrink-0 text-amber-700">
                    <Icon name="sparkles" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="ce-display font-bold text-base sm:text-lg tracking-wide">{c.codigo}</code>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{valorTxt}</span>
                      {!c.activo && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Pausado</span>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {usosTxt}
                      {c.min_subtotal && parseFloat(c.min_subtotal) > 0 && ` · Mín $${parseFloat(c.min_subtotal).toFixed(0)}`}
                      {c.fecha_hasta && ` · Hasta ${c.fecha_hasta}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggle(c)}>{c.activo ? 'Pausar' : 'Activar'}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(c)}>Borrar</Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CuponModal
        open={creating || !!editing}
        cupon={editing ?? undefined}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
      />
    </div>
  );
}

function CuponModal({ open, onClose, onSaved, cupon }: {
  open: boolean; onClose: () => void; onSaved: () => void; cupon?: Cupon;
}) {
  const [codigo,       setCodigo]       = useState('');
  const [tipo,         setTipo]         = useState<'percent' | 'fixed'>('percent');
  const [valor,        setValor]        = useState<number>(10);
  const [minSubtotal,  setMinSubtotal]  = useState<number>(0);
  const [maxUsos,      setMaxUsos]      = useState<string>('');
  const [fechaHasta,   setFechaHasta]   = useState<string>('');
  const [activo,       setActivo]       = useState(true);
  const [horaInicio,   setHoraInicio]   = useState<string>('');
  const [horaFin,      setHoraFin]      = useState<string>('');
  const [diasSemana,   setDiasSemana]   = useState<string[]>([]);
  const [destacado,    setDestacado]    = useState(false);
  const [productosSug, setProductosSug] = useState<number[]>([]);
  const [productos,    setProductos]    = useState<ProductoMin[]>([]);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    if (!open) return;
    setCodigo(cupon?.codigo ?? '');
    setTipo(cupon?.tipo ?? 'percent');
    setValor(cupon ? parseFloat(cupon.valor) : 10);
    setMinSubtotal(cupon ? parseFloat(cupon.min_subtotal) : 0);
    setMaxUsos(cupon?.max_usos?.toString() ?? '');
    setFechaHasta(cupon?.fecha_hasta ?? '');
    setActivo(cupon?.activo ?? true);
    setHoraInicio((cupon?.hora_inicio ?? '').slice(0, 5));
    setHoraFin((cupon?.hora_fin ?? '').slice(0, 5));
    setDiasSemana(cupon?.dias_semana ?? []);
    setDestacado(cupon?.destacado_en_landing ?? false);
    setProductosSug(cupon?.productos_sugeridos ?? []);
    setErrors({});
  }, [open, cupon]);

  // Cargar catálogo de productos solo si el switch de destacado está activo
  useEffect(() => {
    if (!destacado || productos.length > 0) return;
    api.get<{ data: ProductoMin[] }>('/productos').then(({ data }) => setProductos(data.data)).catch(() => {});
  }, [destacado, productos.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload: any = {
        codigo: codigo.toUpperCase().trim(),
        tipo, valor,
        min_subtotal: minSubtotal,
        max_usos: maxUsos ? Number(maxUsos) : null,
        fecha_hasta: fechaHasta || null,
        activo,
        hora_inicio: horaInicio || null,
        hora_fin:    horaFin    || null,
        dias_semana: diasSemana.length > 0 ? diasSemana : null,
        destacado_en_landing: destacado,
        productos_sugeridos: destacado && productosSug.length > 0 ? productosSug : null,
      };
      if (cupon) await api.patch(`/cupones/${cupon.id}`, payload);
      else       await api.post('/cupones', payload);
      toast.success(cupon ? 'Cupón actualizado' : 'Cupón creado');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  const toggleDia = (d: string) => {
    setDiasSemana((s) => s.includes(d) ? s.filter((x) => x !== d) : [...s, d]);
  };

  const toggleProducto = (id: number) => {
    setProductosSug((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  return (
    <Modal open={open} onClose={onClose} title={cupon ? `Editar ${cupon.codigo}` : 'Nuevo cupón'} size="md">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field
          label="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          required
          maxLength={32}
          error={errors.codigo}
          hint="Letras mayúsculas, números, guiones. Ej: BIENVENIDO, VERANO20."
        />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo de descuento" value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Cantidad fija ($)</option>
          </Select>
          <Field
            label={tipo === 'percent' ? 'Porcentaje (%)' : 'Cantidad ($MXN)'}
            type="number"
            step="0.01"
            min="0.01"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            required
            error={errors.valor}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Mínimo de pedido ($)"
            type="number" step="1" min="0"
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(Number(e.target.value))}
            hint="0 = sin mínimo"
          />
          <Field
            label="Máximo de usos"
            type="number" step="1" min="1"
            value={maxUsos}
            onChange={(e) => setMaxUsos(e.target.value)}
            placeholder="Sin límite"
          />
        </div>
        <Field
          label="Vence el"
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          hint="Vacío = no vence"
        />
        <Switch label="Activo" hint="Si lo pausas, el cliente no podrá aplicarlo" checked={activo} onChange={setActivo} />

        {/* ─── F100: Cupón programado por horario ─── */}
        <div className="rounded-2xl border border-line bg-amber-50/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Horario (opcional)</p>
            <p className="text-xs text-muted mt-0.5">Si lo configuras, el cupón solo aplica en este rango. Útil para "happy hour" o "combo del día".</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Desde la hora"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              hint="Ej. 17:00"
              error={errors.hora_inicio}
            />
            <Field
              label="Hasta la hora"
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              hint="Ej. 19:00"
              error={errors.hora_fin}
            />
          </div>

          <div>
            <p className="text-xs font-semibold mb-1.5">Días de la semana (vacío = todos)</p>
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d) => {
                const active = diasSemana.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDia(d.id)}
                    className={cn(
                      'h-10 rounded-lg border-2 text-sm font-bold transition',
                      active ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-line bg-white text-muted hover:border-ink/30',
                    )}
                  >{d.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── F100: Destacar en landing del local ─── */}
        <div className="rounded-2xl border border-line bg-emerald-50/40 p-4 space-y-3">
          <Switch
            label="Mostrar como banner en mi landing pública"
            hint="Aparece arriba de la landing como promo activa. Útil para 2x1, descuentos sorpresa, etc."
            checked={destacado}
            onChange={setDestacado}
          />

          {destacado && (
            <div>
              <p className="text-xs font-semibold mb-1.5">Productos que se agregan al carrito al tocar el banner</p>
              <p className="text-[11px] text-muted mb-2">El cliente toca "Aprovechar" → estos productos se agregan al carrito automáticamente con el código de descuento aplicado.</p>
              {productos.length === 0 ? (
                <p className="text-xs text-muted italic">Cargando productos…</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-line rounded-xl bg-white p-2 space-y-1">
                  {productos.map((p) => {
                    const checked = productosSug.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1 hover:bg-line/30 rounded cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggleProducto(p.id)} className="rounded border-line" />
                        <span className="flex-1 text-sm truncate">{p.nombre}</span>
                        <span className="text-xs text-muted">${Number(p.precio).toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {productosSug.length > 0 && (
                <p className="text-[11px] text-emerald-700 mt-1.5">{productosSug.length} producto(s) seleccionado(s).</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
