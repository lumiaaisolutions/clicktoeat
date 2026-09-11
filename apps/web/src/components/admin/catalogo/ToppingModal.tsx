'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Ingrediente, ToppingGroup } from '@/lib/types';
import { toast } from '@/store/toast';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Wizard } from '@/components/ui/Wizard';
import { InfoBox } from '@/components/ui/InfoBox';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

type RecetaRow = { ingrediente_id: number; cantidad: number };
type ItemRow = { name: string; price: number; receta: RecetaRow[] };

const STEPS = ['Lo básico', 'Opciones', 'Límite y disponibilidad'];
const QUESTIONS: Record<number, { title: string; subtitle?: string }> = {
  1: { title: '¿Cómo se llama el grupo?' },
  2: { title: '¿Qué opciones tiene?' },
  3: { title: '¿Hay un límite?' },
};

export function ToppingModal({
  topping, onClose, onSaved, initialIngredientes,
}: {
  topping: ToppingGroup | null;
  onClose: () => void;
  onSaved: () => void;
  /** Solo para preview/tests: precarga los ingredientes sin depender del fetch. */
  initialIngredientes?: Ingrediente[];
}) {
  const [nombre, setNombre] = useState(topping?.nombre ?? '');
  const [kind, setKind] = useState<'one' | 'many'>(topping?.kind ?? 'many');
  const [required, setRequired] = useState(topping?.required ?? false);
  const [activo, setActivo] = useState(topping?.activo ?? true);
  const [rows, setRows] = useState<ItemRow[]>(
    topping?.items?.length
      ? topping.items.map((it) => ({ name: it.name, price: it.price, receta: (it.receta ?? []).map((r) => ({ ...r })) }))
      : [{ name: '', price: 0, receta: [] }],
  );
  const [incluidos, setIncluidos] = useState<number | ''>(topping?.incluidos ?? '');
  const [maximo, setMaximo] = useState<number | ''>(topping?.maximo ?? '');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(initialIngredientes ?? []);
  const [saving, setSaving] = useState(false);
  const [paso, setPaso] = useState(1);

  useEffect(() => {
    api.get<{ data: Ingrediente[] }>('/ingredientes')
      .then(({ data }) => setIngredientes(data.data))
      .catch(() => { /* preview/offline: conserva initialIngredientes */ });
  }, []);

  const updateRow = (i: number, patch: Partial<ItemRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, { name: '', price: 0, receta: [] }]);
  const removeRow = (i: number) => setRows(rows.filter((_, j) => j !== i));

  const addReceta = (i: number) => {
    const usados = new Set(rows[i].receta.map((r) => r.ingrediente_id));
    const libre = ingredientes.find((ing) => !usados.has(ing.id));
    if (libre) updateRow(i, { receta: [...rows[i].receta, { ingrediente_id: libre.id, cantidad: 1 }] });
  };
  const updateReceta = (i: number, ri: number, patch: Partial<RecetaRow>) =>
    updateRow(i, { receta: rows[i].receta.map((r, j) => (j === ri ? { ...r, ...patch } : r)) });
  const removeReceta = (i: number, ri: number) =>
    updateRow(i, { receta: rows[i].receta.filter((_, j) => j !== ri) });

  const save = async () => {
    const items = rows
      .map((r) => ({
        name: r.name.trim(),
        price: Number(r.price) || 0,
        receta: r.receta.filter((rr) => rr.ingrediente_id && rr.cantidad > 0),
      }))
      .filter((r) => r.name);
    if (!nombre.trim()) { toast.error('Ponle un nombre al grupo (ej. Tamaño).'); return; }
    if (items.length === 0) { toast.error('Agrega al menos una opción (ej. Chico).'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: nombre.trim(), kind, required, activo, items,
        incluidos: incluidos === '' ? null : Number(incluidos),
        maximo: maximo === '' ? null : Number(maximo),
      };
      if (topping) await api.patch(`/toppings/${topping.id}`, payload);
      else await api.post('/toppings', payload);
      toast.success('Grupo guardado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo guardar');
    } finally { setSaving(false); }
  };

  const next = () => {
    if (paso === 1 && !nombre.trim()) {
      toast.error('Ponle un nombre al grupo (ej. Tamaño).');
      return;
    }
    if (paso === 2 && !rows.some((r) => r.name.trim())) {
      toast.error('Agrega al menos una opción (ej. Chico).');
      return;
    }
    setPaso((p) => Math.min(STEPS.length, p + 1));
  };

  const ingMap = new Map(ingredientes.map((i) => [i.id, i]));
  const isLast = paso === STEPS.length;
  const q = QUESTIONS[paso];

  return (
    <Modal open onClose={onClose} title={topping ? 'Editar grupo de opciones' : 'Nuevo grupo de opciones'} size="lg">
      <InfoBox className="-mt-1 mb-5">
        Un grupo agrupa <strong>opciones que el cliente elige al pedir</strong> (ej. “Tamaño”:
        Chico / Grande, o “Extras”: Queso +$15). A cada opción puedes ligarle los <strong>ingredientes
        que usa</strong>: así se descuentan del inventario con cada venta y sabes su disponibilidad.
      </InfoBox>
      <Wizard
        steps={STEPS}
        current={paso}
        onStep={(n) => { if (n <= paso || nombre.trim()) setPaso(n); }}
        kicker={`Paso ${paso} de ${STEPS.length}`}
        title={q.title}
        subtitle={q.subtitle}
        onCancel={onClose}
        onBack={() => setPaso((p) => p - 1)}
        onNext={isLast ? save : next}
        saving={saving}
        isLast={isLast}
        submitLabel="Guardar grupo"
      >
        {paso === 1 && (
          <div className="space-y-4">
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
          </div>
        )}

        {paso === 2 && (
          <div>
            <p className="block text-sm font-medium mb-2">Opciones</p>
            <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-line p-3 bg-line/10">
                <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    placeholder="Opción (ej. Grande, Queso extra)"
                    className="px-3 py-2 rounded-lg border border-line bg-white text-sm font-medium"
                    maxLength={60}
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={r.price}
                      onChange={(e) => updateRow(i, { price: Number(e.target.value) })}
                      placeholder="Costo extra"
                      className="w-full pl-6 pr-2 py-2 rounded-lg border border-line bg-white text-sm tabular-nums"
                    />
                  </div>
                  <button type="button" onClick={() => removeRow(i)} className="text-red-500 hover:bg-red-50 rounded-lg w-8 h-8 grid place-items-center" title="Quitar opción">
                    <Icon name="x" size={13} />
                  </button>
                </div>

                {/* Ingredientes que descuenta esta opción */}
                {ingredientes.length > 0 ? (
                  <div className="mt-2 pl-1 border-l-2 border-line ml-1">
                    {r.receta.map((rr, ri) => {
                      const ing = ingMap.get(rr.ingrediente_id);
                      const usados = new Set(r.receta.map((x, j) => (j === ri ? -1 : x.ingrediente_id)));
                      const opciones = ingredientes.filter((x) => x.id === rr.ingrediente_id || !usados.has(x.id));
                      return (
                        <div key={ri} className="flex items-center gap-2 mb-1.5 flex-wrap pl-2">
                          <span className="text-xs text-muted">Usa</span>
                          <input
                            type="number" step="0.001" min={0.001}
                            value={rr.cantidad}
                            onChange={(e) => updateReceta(i, ri, { cantidad: Number(e.target.value) })}
                            className="w-20 px-2 py-1.5 rounded-lg border border-line bg-white text-sm text-right tabular-nums"
                          />
                          <span className="text-xs text-muted">{ing?.unidad ?? ''} de</span>
                          <select
                            value={rr.ingrediente_id}
                            onChange={(e) => updateReceta(i, ri, { ingrediente_id: Number(e.target.value) })}
                            className="flex-1 min-w-[130px] px-2 py-1.5 rounded-lg border border-line bg-white text-sm"
                          >
                            {opciones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                          </select>
                          <button type="button" onClick={() => removeReceta(i, ri)} className="text-red-500 hover:bg-red-50 rounded-lg w-7 h-7 grid place-items-center shrink-0" title="Quitar ingrediente">
                            <Icon name="x" size={11} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => addReceta(i)}
                      disabled={r.receta.length >= ingredientes.length}
                      className="inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink mt-0.5 pl-2 disabled:opacity-40"
                    >
                      <Icon name="plus" size={11} /> Ingrediente que descuenta del inventario
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted mt-2 pl-2">
                    Para descontar inventario con esta opción, primero registra insumos en <a href="/admin/inventario" className="underline">Inventario</a>.
                  </p>
                )}
              </div>
            ))}
          </div>
            <button type="button" onClick={addRow} className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink">
              <Icon name="plus" size={11} /> Agregar opción
            </button>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            {kind === 'many' ? (
              <>
                <InfoBox>
                  Puedes incluir algunos toppings <strong>gratis</strong> y cobrar los que sobren.
                  Ej.: incluye 2 gratis; si el cliente elige más, cada topping adicional cobra su precio.
                </InfoBox>
                <Field
                  label="¿Cuántos van incluidos gratis?"
                  type="number" min="0" step="1"
                  value={incluidos}
                  onChange={(e) => setIncluidos(e.target.value === '' ? '' : Number(e.target.value))}
                  hint="Los toppings más caros se incluyen gratis; los demás cobran su precio."
                />
                <Field
                  label="¿Máximo que puede elegir?"
                  type="number" min="1" step="1"
                  value={maximo}
                  onChange={(e) => setMaximo(e.target.value === '' ? '' : Number(e.target.value))}
                  hint="Deja vacío para sin tope."
                />
              </>
            ) : (
              <p className="text-sm text-muted rounded-2xl border border-line bg-line/10 p-3">
                El límite no aplica cuando el cliente solo elige una opción.
              </p>
            )}

            <Switch label="Activo" hint="Si lo apagas, no aparece para elegir al crear productos (pero no se borra)." checked={activo} onChange={setActivo} />
          </div>
        )}
      </Wizard>
    </Modal>
  );
}
