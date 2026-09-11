'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Categoria, ExtraGroup, Ingrediente, Producto, Receta } from '@/lib/types';
import { toast } from '@/store/toast';
import { Field, Textarea, Select, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { Wizard } from '@/components/ui/Wizard';
import { InfoBox } from '@/components/ui/InfoBox';

interface RecetaLinea { ingrediente_id: number | null; cantidad: number }
const STEPS = ['Lo básico', 'Presentación', 'Extras', 'Inventario'];
const QUESTIONS: Record<number, { title: string; subtitle?: string }> = {
  1: { title: '¿Qué platillo es?' },
  2: { title: '¿Cómo se ve en tu menú?' },
  3: { title: '¿Se puede personalizar?', subtitle: 'Agrega opciones como tamaño, salsas o extras. Si no aplica, déjalo vacío y sigue.' },
  4: { title: '¿Qué ingredientes usa?', subtitle: 'Se descuentan solos del inventario con cada venta. Es opcional.' },
};

export function ProductoModal({
  open, onClose, onSaved, producto, categorias,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  producto?: Producto;
  categorias: Categoria[];
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState(0);
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [tag, setTag] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [imagen, setImagen] = useState<{ url: string | null; public_id: string | null }>({ url: null, public_id: null });
  const [extras, setExtras] = useState<ExtraGroup[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [recetaLineas, setRecetaLineas] = useState<RecetaLinea[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [paso, setPaso] = useState(1);

  const paso1Valido = nombre.trim() !== '' && categoriaId !== '' && precio > 0;

  /** Avanza validando el paso 1 (lo esencial) antes de continuar. */
  const next = () => {
    if (paso === 1 && !paso1Valido) {
      setErrors({
        ...(nombre.trim() === '' ? { nombre: 'Escribe el nombre del platillo.' } : {}),
        ...(categoriaId === '' ? { categoria_id: 'Elige una categoría.' } : {}),
        ...(precio <= 0 ? { precio: 'Pon un precio mayor a 0.' } : {}),
      });
      return;
    }
    setErrors({});
    setPaso((p) => Math.min(STEPS.length, p + 1));
  };

  useEffect(() => {
    if (!open) return;
    setPaso(1);
    setNombre(producto?.nombre ?? '');
    setDescripcion(producto?.descripcion ?? '');
    setPrecio(producto?.precio ?? 0);
    setCategoriaId(producto?.categoria_id ?? categorias[0]?.id ?? '');
    setTag(producto?.tag ?? '');
    setDisponible(producto?.disponible ?? true);
    setImagen({
      url: producto?.imagen_url ?? null,
      public_id: producto?.imagen_public_id ?? null,
    });
    setExtras(producto?.extras ?? []);
    setErrors({});

    // Inventario (paso 4): ingredientes del local + receta actual si es edición.
    api.get<{ data: Ingrediente[] }>('/ingredientes')
      .then(({ data }) => setIngredientes(data.data))
      .catch(() => setIngredientes([]));
    if (producto) {
      api.get<{ data: Receta[] }>(`/productos/${producto.id}/recetas`)
        .then(({ data }) => setRecetaLineas(
          data.data
            .filter((r) => r.tipo === 'ingrediente' && r.ingrediente_id)
            .map((r) => ({ ingrediente_id: r.ingrediente_id, cantidad: Number(r.cantidad) })),
        ))
        .catch(() => setRecetaLineas([]));
    } else {
      setRecetaLineas([]);
    }
  }, [open, producto, categorias]);

  const guardar = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        categoria_id: categoriaId,
        nombre,
        descripcion: descripcion || null,
        precio,
        tag: tag || null,
        disponible,
        imagen_url:       imagen.url,
        imagen_public_id: imagen.public_id,
        extras:           extras.length ? extras : null,
      };
      let prodId = producto?.id;
      if (producto) {
        await api.patch(`/productos/${producto.id}`, payload);
      } else {
        const { data } = await api.post<{ data: { id: number } }>('/productos', payload);
        prodId = data.data.id;
      }
      // Receta (inventario): solo si el local maneja ingredientes.
      if (prodId && ingredientes.length > 0) {
        const limpio = recetaLineas
          .filter((r) => r.ingrediente_id && r.cantidad > 0)
          .map((r) => ({ ingrediente_id: r.ingrediente_id, cantidad: r.cantidad }));
        try {
          await api.put(`/productos/${prodId}/recetas`, { recetas: limpio });
        } catch {
          toast.error('El platillo se guardó, pero la receta no. Ajústala en Editar.');
        }
      }
      toast.success(producto ? 'Platillo actualizado' : 'Platillo creado');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (flat.nombre || flat.categoria_id || flat.precio) setPaso(1);
      if (!Object.keys(flat).length) toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const isLast = paso === STEPS.length;
  const q = QUESTIONS[paso];

  return (
    <Modal open={open} onClose={onClose} title={producto ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <InfoBox className="-mt-1 mb-5">
        Un producto es cada <strong>platillo que vendes</strong>. Aparece en tu menú
        dentro de su categoría. Llena estos pasos y queda listo.
      </InfoBox>
      <Wizard
        steps={STEPS}
        current={paso}
        onStep={(n) => { if (n <= paso || paso1Valido) { setErrors({}); setPaso(n); } }}
        kicker={`Paso ${paso} de ${STEPS.length}`}
        title={q.title}
        subtitle={q.subtitle}
        onCancel={onClose}
        onBack={() => { setErrors({}); setPaso((p) => p - 1); }}
        onNext={isLast ? guardar : next}
        saving={saving}
        isLast={isLast}
        submitLabel="Guardar platillo"
      >
        {paso === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-4">
            <div data-tour="producto-modal-imagen">
              <p className="block text-sm font-medium mb-1">Foto</p>
              <ImageUpload value={imagen.url} publicId={imagen.public_id} folder="productos" aspect="square" onChange={setImagen} />
            </div>
            <div>
              <Field data-tour="producto-modal-nombre" label="Nombre del platillo" placeholder="ej. Tacos al pastor" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.nombre} maxLength={120} />
              <div className="grid grid-cols-2 gap-3">
                <Select data-tour="producto-modal-categoria" label="Categoría" value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))} error={errors.categoria_id} required>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
                <Field data-tour="producto-modal-precio" label="Precio ($)" type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} error={errors.precio} required />
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <>
            <Textarea label="Descripción (opcional)" placeholder="Cuéntale al cliente qué lleva y cómo sabe." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errors.descripcion} maxLength={1000} />
            <Field label="Etiqueta (opcional)" placeholder="ej. Más pedido, Nuevo, Picante" value={tag} onChange={(e) => setTag(e.target.value)} hint="Una palabra que resalta el platillo en tu menú." error={errors.tag} />
            <Switch data-tour="producto-modal-disponible" label="Mostrar en el menú" hint="Si lo apagas, no aparece en tu menú (pero no se borra)." checked={disponible} onChange={setDisponible} />
          </>
        )}

        {paso === 3 && (
          <div data-tour="producto-modal-extras">
            <ExtrasEditor value={extras} onChange={setExtras} />
          </div>
        )}

        {paso === 4 && (
          <InventarioStep
            ingredientes={ingredientes}
            lineas={recetaLineas}
            onChange={setRecetaLineas}
            nombrePlatillo={nombre.trim() || 'este platillo'}
          />
        )}
      </Wizard>
    </Modal>
  );
}

/* ── Paso 4: qué ingredientes usa el platillo (descuento de inventario) ── */
function InventarioStep({
  ingredientes, lineas, onChange, nombrePlatillo,
}: {
  ingredientes: Ingrediente[];
  lineas: RecetaLinea[];
  onChange: (v: RecetaLinea[]) => void;
  nombrePlatillo: string;
}) {
  if (ingredientes.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-medium mb-1">¿Controlas inventario?</p>
        <p className="text-muted">
          Si registras tus insumos en <a href="/admin/inventario" className="underline">Inventario</a>, aquí dices
          cuánto usa este platillo para descontarlo solo con cada venta. Si no lo usas, deja este paso vacío y guarda.
        </p>
      </div>
    );
  }

  const usados = new Set(lineas.map((l) => l.ingrediente_id));
  const ingMap = new Map(ingredientes.map((i) => [i.id, i]));
  const add = () => {
    const libre = ingredientes.find((i) => !usados.has(i.id));
    if (libre) onChange([...lineas, { ingrediente_id: libre.id, cantidad: 1 }]);
  };
  const update = (i: number, patch: Partial<RecetaLinea>) => onChange(lineas.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => onChange(lineas.filter((_, j) => j !== i));

  return (
    <div>
      {lineas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">
          Aún no agregaste ingredientes. Es opcional — sirve para descontar tu inventario con cada venta.
        </div>
      ) : (
        <ul className="space-y-2">
          {lineas.map((l, i) => {
            const ing = l.ingrediente_id ? ingMap.get(l.ingrediente_id) : null;
            const opciones = ingredientes.filter((x) => x.id === l.ingrediente_id || !usados.has(x.id));
            return (
              <li key={i} className="flex items-center gap-2 flex-wrap">
                <select
                  value={l.ingrediente_id ?? ''}
                  onChange={(e) => update(i, { ingrediente_id: Number(e.target.value) })}
                  className="flex-1 min-w-[150px] px-3 py-2 border border-line rounded-xl bg-white text-sm"
                >
                  {opciones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                </select>
                <input
                  type="number" step="0.001" min={0.001}
                  value={l.cantidad}
                  onChange={(e) => update(i, { cantidad: Number(e.target.value) })}
                  className="w-24 px-3 py-2 border border-line rounded-xl bg-white text-right tabular-nums"
                  aria-label="Cantidad por platillo"
                />
                <span className="text-xs text-muted w-10 shrink-0">{ing?.unidad ?? ''}</span>
                <button type="button" onClick={() => remove(i)} className="text-red-500 hover:bg-red-50 rounded-lg w-8 h-8 grid place-items-center shrink-0" title="Quitar">
                  <Icon name="x" size={13} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        disabled={lineas.length >= ingredientes.length}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-sm font-semibold hover:bg-line/40 disabled:opacity-50"
      >
        <Icon name="plus" size={13} /> Agregar ingrediente
      </button>
      <p className="text-xs text-muted mt-2">Escribe cuánto usa <strong>{nombrePlatillo}</strong> por porción. Se resta del inventario con cada venta.</p>
    </div>
  );
}

function ExtrasEditor({ value, onChange }: { value: ExtraGroup[]; onChange: (v: ExtraGroup[]) => void }) {
  const addGroup = () => onChange([...value, { group: '', kind: 'many', required: false, items: [] }]);
  const removeGroup = (i: number) => onChange(value.filter((_, j) => j !== i));
  const updateGroup = (i: number, patch: Partial<ExtraGroup>) => {
    onChange(value.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  };
  const addItem = (gi: number) => {
    updateGroup(gi, {
      items: [...value[gi].items, { id: 'item-' + Date.now(), name: '', price: 0 }],
    });
  };
  const updateItem = (gi: number, ii: number, patch: Partial<ExtraGroup['items'][number]>) => {
    updateGroup(gi, {
      items: value[gi].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)),
    });
  };
  const removeItem = (gi: number, ii: number) => {
    updateGroup(gi, { items: value[gi].items.filter((_, j) => j !== ii) });
  };

  return (
    <section>
      <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="ce-display font-bold text-base">Extras / Toppings</p>
          <p className="text-xs text-muted">
            Permite que el cliente personalice el pedido (ej. extra queso $15, sin cebolla, doble carne $25).
          </p>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line text-xs font-semibold hover:bg-line/40"
        >
          <Icon name="plus" size={12} />
          Agregar grupo
        </button>
      </header>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Sin extras configurados. Agrega un grupo para empezar.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((g, gi) => (
            <div key={gi} className="rounded-2xl border border-line p-3 bg-line/10">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center mb-3">
                <input
                  type="text"
                  value={g.group}
                  onChange={(e) => updateGroup(gi, { group: e.target.value })}
                  placeholder="Nombre del grupo (ej. Toppings, Tamaño, Salsas)"
                  className="px-3 py-2 rounded-xl border border-line bg-white text-sm font-semibold"
                  maxLength={40}
                />
                <select
                  value={g.kind}
                  onChange={(e) => updateGroup(gi, { kind: e.target.value as 'one' | 'many' })}
                  className="px-2 py-2 rounded-xl border border-line bg-white text-xs"
                  title="Cuántas opciones puede elegir el cliente"
                >
                  <option value="many">Varios (toppings)</option>
                  <option value="one">Sólo uno (tamaño)</option>
                </select>
                <label className="text-xs text-muted inline-flex items-center gap-1.5 px-2">
                  <input
                    type="checkbox"
                    checked={!!g.required}
                    onChange={(e) => updateGroup(gi, { required: e.target.checked })}
                  />
                  Obligatorio
                </label>
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="text-red-600 hover:bg-red-50 rounded-lg w-8 h-8 grid place-items-center"
                  title="Eliminar grupo"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>

              <div className="space-y-1.5">
                {g.items.map((it, ii) => (
                  <div key={ii} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(gi, ii, { name: e.target.value })}
                      placeholder="Nombre (ej. Queso extra)"
                      className="px-3 py-2 rounded-lg border border-line bg-white text-sm"
                      maxLength={60}
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.price}
                        onChange={(e) => updateItem(gi, ii, { price: Number(e.target.value) })}
                        placeholder="Precio extra"
                        className="w-full pl-6 pr-2 py-2 rounded-lg border border-line bg-white text-sm tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(gi, ii)}
                      className="text-red-500 hover:bg-red-50 rounded-lg w-8 h-8 grid place-items-center"
                      title="Eliminar"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addItem(gi)}
                  className="inline-flex items-center gap-1.5 text-xs text-ink/70 hover:text-ink mt-1"
                >
                  <Icon name="plus" size={11} />
                  Agregar opción
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
