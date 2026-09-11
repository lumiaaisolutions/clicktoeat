'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ToppingGroup } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { InfoBox } from '@/components/ui/InfoBox';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type ItemRow = { name: string; price: number };

export function ToppingModal({ topping, onClose, onSaved }: { topping: ToppingGroup | null; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(topping?.nombre ?? '');
  const [kind, setKind] = useState<'one' | 'many'>(topping?.kind ?? 'many');
  const [required, setRequired] = useState(topping?.required ?? false);
  const [activo, setActivo] = useState(topping?.activo ?? true);
  const [rows, setRows] = useState<ItemRow[]>(topping?.items?.length ? topping.items : [{ name: '', price: 0 }]);
  const [saving, setSaving] = useState(false);

  const updateRow = (i: number, patch: Partial<ItemRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, { name: '', price: 0 }]);
  const removeRow = (i: number) => setRows(rows.filter((_, j) => j !== i));

  const save = async () => {
    const items = rows.map((r) => ({ name: r.name.trim(), price: Number(r.price) || 0 })).filter((r) => r.name);
    if (!nombre.trim()) { toast.error('Ponle un nombre al grupo (ej. Tamaño).'); return; }
    if (items.length === 0) { toast.error('Agrega al menos una opción (ej. Chico).'); return; }
    setSaving(true);
    try {
      const payload = { nombre: nombre.trim(), kind, required, activo, items };
      if (topping) await api.patch(`/toppings/${topping.id}`, payload);
      else await api.post('/toppings', payload);
      toast.success('Grupo guardado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={topping ? 'Editar grupo de opciones' : 'Nuevo grupo de opciones'}>
      <div className="space-y-4">
        <InfoBox>
          Un grupo agrupa <strong>opciones que el cliente elige al pedir</strong>. Ejemplo: el grupo
          <strong> “Tamaño”</strong> con Chico, Mediano y Grande; o <strong>“Extras”</strong> con
          Queso +$15 y Tocino +$20.
        </InfoBox>

        <Field label="¿Cómo se llama el grupo?" placeholder="ej. Tamaño, Salsas, Extras" value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={80} />

        <div>
          <p className="block text-sm font-medium mb-1">¿Cuántas puede elegir el cliente?</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'many', label: 'Varias', ej: 'ej. Extras, Salsas' },
              { v: 'one', label: 'Solo una', ej: 'ej. Tamaño' },
            ] as const).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setKind(o.v)}
                className={cn('rounded-2xl border-2 px-3 py-2.5 text-left transition', kind === o.v ? 'border-[#F26A1F] bg-[#F26A1F]/10' : 'border-line hover:border-[#F26A1F]/40')}
              >
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-muted">{o.ej}</span>
              </button>
            ))}
          </div>
        </div>

        <Switch label="Obligatorio" hint="El cliente debe elegir una opción de este grupo para poder pedir." checked={required} onChange={setRequired} />

        <div>
          <p className="block text-sm font-medium mb-1">Opciones</p>
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  placeholder="Opción (ej. Grande, Queso extra)"
                  className="px-3 py-2 rounded-lg border border-line bg-white text-sm"
                  maxLength={60}
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={r.price}
                    onChange={(e) => updateRow(i, { price: Number(e.target.value) })}
                    placeholder="Costo extra (0 = gratis)"
                    className="w-full pl-6 pr-2 py-2 rounded-lg border border-line bg-white text-sm tabular-nums"
                  />
                </div>
                <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:bg-red-50 rounded-lg w-8 h-8 grid place-items-center" title="Quitar">
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink">
            <Icon name="plus" size={11} /> Agregar opción
          </button>
        </div>

        <Switch label="Activo" hint="Si lo apagas, no aparece para elegir al crear productos (pero no se borra)." checked={activo} onChange={setActivo} />

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar grupo</Button>
        </div>
      </div>
    </Modal>
  );
}
