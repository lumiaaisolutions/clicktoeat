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
}

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
    setErrors({});
  }, [open, cupon]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        codigo: codigo.toUpperCase().trim(),
        tipo, valor,
        min_subtotal: minSubtotal,
        max_usos: maxUsos ? Number(maxUsos) : null,
        fecha_hasta: fechaHasta || null,
        activo,
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

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
