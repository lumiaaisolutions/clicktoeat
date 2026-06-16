'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';

interface CuponGlobal {
  id: number;
  codigo: string;
  descripcion: string | null;
  tipo: 'porcentaje' | 'monto';
  valor: number;
  min_subtotal: number | null;
  max_usos_por_local: number | null;
  aplicar_nuevos: boolean;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}

export default function CuponesGlobalesPage() {
  const [items, setItems] = useState<CuponGlobal[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);

  const refresh = () => {
    setItems(null);
    api.get<{ data: CuponGlobal[] }>('/admin/cupones-globales').then(({ data }) => setItems(data.data));
  };
  useEffect(refresh, []);

  const sync = async (cg: CuponGlobal) => {
    if (!confirm(`Replicar "${cg.codigo}" a TODOS los locales activos?`)) return;
    setSyncing(cg.id);
    try {
      const { data } = await api.post<{ data: { sincronizados: number } }>(`/admin/cupones-globales/${cg.id}/sync`);
      toast.success(`Sincronizado a ${data.data.sincronizados} locales`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al sincronizar');
    } finally { setSyncing(null); }
  };

  const del = async (cg: CuponGlobal) => {
    if (!confirm(`Borrar plantilla "${cg.codigo}"? (No afecta cupones ya replicados a locales.)`)) return;
    await api.delete(`/admin/cupones-globales/${cg.id}`);
    refresh();
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Cupones globales"
        kickerIcon="sparkles"
        title="Promociones para"
        titleAccent="toda la plataforma."
        description="Crea un cupón aquí y replícalo a todos tus locales con un click. Útil para Black Friday, Buen Fin, etc."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={14} className="mr-1.5" />Nueva plantilla</Button>}
      />

      {!items ? (
        <Skeleton className="h-40" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center text-muted">
          Sin plantillas de cupones todavía.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start gap-3 flex-wrap">
                <code className="text-base font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-lg">{c.codigo}</code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {c.tipo === 'porcentaje' ? `${c.valor}% de descuento` : `$${c.valor} MXN de descuento`}
                    {c.min_subtotal && ` · Mín. pedido $${c.min_subtotal}`}
                    {c.max_usos_por_local && ` · Máx. ${c.max_usos_por_local} usos/local`}
                  </p>
                  {c.descripcion && <p className="text-xs text-muted mt-1">{c.descripcion}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button onClick={() => sync(c)} loading={syncing === c.id}>Replicar a todos</Button>
                  <button onClick={() => del(c)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">Borrar</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating && <CrearCuponModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />}
    </div>
  );
}

function CrearCuponModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [valor, setValor] = useState(10);
  const [minSubtotal, setMinSubtotal] = useState<number | ''>('');
  const [maxUsos, setMaxUsos] = useState<number | ''>('');
  const [aplicarNuevos, setAplicarNuevos] = useState(true);
  const [vigenteHasta, setVigenteHasta] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/cupones-globales', {
        codigo: codigo.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
        descripcion: descripcion || null,
        tipo,
        valor,
        min_subtotal: minSubtotal || null,
        max_usos_por_local: maxUsos || null,
        aplicar_nuevos: aplicarNuevos,
        vigente_hasta: vigenteHasta || null,
      });
      toast.success('Plantilla creada');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl border border-line p-5 space-y-3">
        <h3 className="ce-display font-bold text-lg">Nueva plantilla de cupón</h3>
        <Field label="Código (sin espacios, mayúsculas)" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} required maxLength={32} hint="Ej. BLACKFRIDAY, BIENVENIDA10" />
        <Textarea label="Descripción interna" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} />
        <div>
          <label className="text-sm font-medium block mb-1">Tipo de descuento</label>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => setTipo('porcentaje')} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${tipo === 'porcentaje' ? 'bg-ink text-white' : 'bg-white border-line'}`}>Porcentaje</button>
            <button type="button" onClick={() => setTipo('monto')}      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${tipo === 'monto'      ? 'bg-ink text-white' : 'bg-white border-line'}`}>Monto fijo</button>
          </div>
        </div>
        <Field label={tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto (MXN)'} type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} required />
        <Field label="Mínimo de pedido (MXN)" type="number" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value === '' ? '' : Number(e.target.value))} />
        <Field label="Máx. usos por local" type="number" value={maxUsos} onChange={(e) => setMaxUsos(e.target.value === '' ? '' : Number(e.target.value))} hint="Vacío = ilimitado" />
        <Field label="Vigente hasta" type="date" value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} />
        <Switch label="Replicar automáticamente a locales nuevos" checked={aplicarNuevos} onChange={setAplicarNuevos} />
        <div className="flex gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Crear</Button>
        </div>
      </form>
    </div>
  );
}
