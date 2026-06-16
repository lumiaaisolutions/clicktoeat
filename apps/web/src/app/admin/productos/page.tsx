'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria, ExtraGroup, Ingrediente, Paginated, Producto, Receta, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Select, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn, formatMXN } from '@/lib/utils';

export default function ProductosPage() {
  const [items, setItems] = useState<Producto[] | null>(null);
  const [meta, setMeta] = useState<Paginated<Producto>['meta'] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<number | ''>('');
  const [trashed, setTrashed] = useState<'' | 'only' | 'with'>('');
  const [editing, setEditing] = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);
  const [receta, setReceta] = useState<Producto | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<Paginated<Producto>>('/productos', {
      params: {
        page,
        per_page: 20,
        q: q || undefined,
        categoria_id: filterCategoria || undefined,
        trashed: trashed || undefined,
      },
    });
    setItems(data.data);
    setMeta(data.meta);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [page, q, filterCategoria, trashed]);
  useEffect(() => {
    api.get<{ data: Categoria[] }>('/categorias').then(({ data }) => setCategorias(data.data));
  }, []);

  const handleDelete = async (p: Producto) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await api.delete(`/productos/${p.id}`);
      toast.success('Producto eliminado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar');
    }
  };

  const toggleDisponible = async (p: Producto) => {
    try {
      await api.patch(`/productos/${p.id}`, { disponible: !p.disponible });
      refresh();
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const handleRestore = async (p: Producto) => {
    try {
      await api.post(`/productos/${p.id}/restore`);
      toast.success(`"${p.nombre}" restaurado`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo restaurar');
    }
  };

  // Agrupar productos por categoría cuando NO hay filtro de categoría
  const grouped = useMemo(() => {
    if (filterCategoria) return null;  // vista flat cuando hay filtro
    if (!items) return null;
    const byCat = new Map<number, { categoria: Categoria; productos: Producto[] }>();
    const sinCat: Producto[] = [];
    for (const p of items) {
      const catId = p.categoria_id ?? p.categoria?.id;
      if (!catId) { sinCat.push(p); continue; }
      const cat = categorias.find((c) => c.id === catId);
      if (!cat) { sinCat.push(p); continue; }
      if (!byCat.has(cat.id)) byCat.set(cat.id, { categoria: cat, productos: [] });
      byCat.get(cat.id)!.productos.push(p);
    }
    return { groups: [...byCat.values()].sort((a, b) => a.categoria.orden - b.categoria.orden), sinCat };
  }, [items, categorias, filterCategoria]);

  return (
    <div>
      <AdminPageHeader
        kicker="Productos"
        kickerIcon="package"
        title="Tu menú,"
        titleAccent="lo que tus clientes ven."
        description="Cada producto aparece automáticamente en tu landing pública. Agrupados por categoría para encontrarlos rápido."
        tourSlug="productos"
        actions={
          <Button data-tour="productos-nuevo" onClick={() => setCreating(true)} disabled={categorias.length === 0}>
            + Nuevo producto
          </Button>
        }
      />

      {categorias.length === 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm mb-4">
          Necesitas al menos una <strong>categoría</strong> antes de crear productos.
        </div>
      )}

      <div data-tour="productos-buscar" className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value); }}
          className="flex-1 min-w-[200px] px-3 py-2 border border-line rounded-xl bg-white"
        />
        <select
          value={filterCategoria}
          onChange={(e) => { setPage(1); setFilterCategoria(e.target.value ? Number(e.target.value) : ''); }}
          className="px-3 py-2 border border-line rounded-xl bg-white"
        >
          <option value="">Agrupar por categoría</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>Solo: {c.nombre}</option>)}
        </select>
        <select
          value={trashed}
          onChange={(e) => { setPage(1); setTrashed(e.target.value as '' | 'only' | 'with'); }}
          className="px-3 py-2 border border-line rounded-xl bg-white"
          title="Filtro de productos eliminados"
        >
          <option value="">Activos</option>
          <option value="with">Activos + eliminados</option>
          <option value="only">Sólo eliminados</option>
        </select>
      </div>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">Sin productos.</div>
      ) : grouped ? (
        <div className="space-y-4">
          {grouped.groups.map(({ categoria, productos: ps }) => (
            <ProductosGroup
              key={categoria.id}
              categoria={categoria}
              productos={ps}
              trashed={trashed === 'only'}
              onToggle={toggleDisponible}
              onReceta={setReceta}
              onEdit={setEditing}
              onDelete={handleDelete}
              onRestore={handleRestore}
            />
          ))}
          {grouped.sinCat.length > 0 && (
            <ProductosGroup
              categoria={{ id: -1, nombre: 'Sin categoría', orden: 999, slug: '__sin__' } as Categoria}
              productos={grouped.sinCat}
              trashed={trashed === 'only'}
              onToggle={toggleDisponible}
              onReceta={setReceta}
              onEdit={setEditing}
              onDelete={handleDelete}
              onRestore={handleRestore}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((p) => (
              <ProductRow
                key={p.id}
                p={p}
                trashed={trashed === 'only'}
                onToggle={toggleDisponible}
                onReceta={setReceta}
                onEdit={setEditing}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            ))}
          </ul>
        </div>
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

      <ProductoModal
        open={creating || !!editing}
        producto={editing ?? undefined}
        categorias={categorias}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
      />

      <RecetaModal
        open={!!receta}
        producto={receta ?? undefined}
        onClose={() => setReceta(null)}
      />
    </div>
  );
}

/* ───── Row reusable de un producto ───── */
function ProductRow({
  p, trashed, onToggle, onReceta, onEdit, onDelete, onRestore,
}: {
  p: Producto;
  trashed: boolean;
  onToggle: (p: Producto) => void;
  onReceta: (p: Producto) => void;
  onEdit:   (p: Producto) => void;
  onDelete: (p: Producto) => void;
  onRestore:(p: Producto) => void;
}) {
  return (
    <li className="flex items-center gap-3 sm:gap-4 p-3">
      <div className="w-14 h-14 rounded-xl bg-line/40 overflow-hidden shrink-0">
        {p.imagen_url && <img src={p.imagen_url} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{p.nombre}</div>
        <div className="text-xs text-muted">
          {p.categoria?.nombre ?? '—'} · {formatMXN(p.precio)}
        </div>
      </div>
      <button onClick={() => onToggle(p)} className="text-xs px-2 py-1 rounded-full border border-line whitespace-nowrap hidden sm:inline-flex">
        {p.disponible ? '● Disponible' : '○ Oculto'}
      </button>
      <div className="flex gap-1 shrink-0">
        {trashed ? (
          <Button variant="ghost" size="sm" onClick={() => onRestore(p)}>↺ Restaurar</Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => onReceta(p)}>Receta</Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>Editar</Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(p)}>Borrar</Button>
          </>
        )}
      </div>
    </li>
  );
}

/* ───── Grupo expandible de productos por categoría ───── */
function ProductosGroup({
  categoria, productos, trashed, onToggle, onReceta, onEdit, onDelete, onRestore,
}: {
  categoria: Categoria;
  productos: Producto[];
  trashed: boolean;
  onToggle: (p: Producto) => void;
  onReceta: (p: Producto) => void;
  onEdit:   (p: Producto) => void;
  onDelete: (p: Producto) => void;
  onRestore:(p: Producto) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-line bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-line/20 transition text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-50 grid place-items-center shrink-0">
          <Icon name="utensils" size={14} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ce-display font-bold text-base sm:text-lg truncate">{categoria.nombre}</p>
          <p className="text-xs text-muted">
            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        <Icon
          name="chevron-down"
          size={18}
          className={cn('text-muted transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {productos.map((p) => (
            <ProductRow
              key={p.id}
              p={p}
              trashed={trashed}
              onToggle={onToggle}
              onReceta={onReceta}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductoModal({
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
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
  }, [open, producto, categorias]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (producto) {
        await api.patch(`/productos/${producto.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api.post('/productos', payload);
        toast.success('Producto creado');
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
    <Modal open={open} onClose={onClose} title={producto ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <p className="block text-sm font-medium mb-1">Imagen</p>
          <ImageUpload
            value={imagen.url}
            publicId={imagen.public_id}
            folder="productos"
            aspect="square"
            onChange={setImagen}
          />
        </div>
        <div className="md:col-span-2">
          <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.nombre} maxLength={120} />
          <Textarea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} error={errors.descripcion} maxLength={1000} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))} error={errors.categoria_id} required>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            <Field label="Precio (MXN)" type="number" step="0.01" value={precio} onChange={(e) => setPrecio(Number(e.target.value))} error={errors.precio} required />
          </div>
          <Field label="Tag (opcional)" value={tag} onChange={(e) => setTag(e.target.value)} hint="p.ej. Más pedido, Nuevo, Picante" error={errors.tag} />
          <Switch label="Disponible" hint="Si se oculta, sigue existiendo pero no se muestra en la landing" checked={disponible} onChange={setDisponible} />
        </div>

        <div className="md:col-span-3 border-t border-line pt-4">
          <ExtrasEditor value={extras} onChange={setExtras} />
        </div>

        <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

interface RecetaLinea {
  tipo: 'ingrediente' | 'componente';
  ingrediente_id: number | null;
  componente_producto_id: number | null;
  cantidad: number;
}

function RecetaModal({
  open, onClose, producto,
}: { open: boolean; onClose: () => void; producto?: Producto }) {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [productos, setProductos]       = useState<Producto[]>([]);
  const [recetas, setRecetas]           = useState<RecetaLinea[]>([]);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    if (!open || !producto) return;
    let alive = true;
    setLoading(true);
    setErrors({});
    Promise.all([
      api.get<{ data: Ingrediente[] }>('/ingredientes'),
      api.get<Paginated<Producto>>('/productos', { params: { per_page: 100 } }),
      api.get<{ data: Receta[] }>(`/productos/${producto.id}/recetas`),
    ]).then(([i, p, r]) => {
      if (!alive) return;
      setIngredientes(i.data.data);
      setProductos(p.data.data.filter((x) => x.id !== producto.id));   // excluye self
      setRecetas(r.data.data.map<RecetaLinea>((x) => ({
        tipo: x.tipo,
        ingrediente_id:         x.ingrediente_id,
        componente_producto_id: x.componente_producto_id,
        cantidad:               Number(x.cantidad),
      })));
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, producto]);

  if (!producto) return null;

  const ingMap   = new Map(ingredientes.map((i) => [i.id, i]));
  const prodMap  = new Map(productos.map((p) => [p.id, p]));

  const addIngredienteLine = () => {
    const usados = new Set(recetas.filter(r => r.tipo === 'ingrediente').map(r => r.ingrediente_id));
    const libre  = ingredientes.find((i) => !usados.has(i.id));
    if (!libre) return;
    setRecetas([...recetas, {
      tipo: 'ingrediente', ingrediente_id: libre.id, componente_producto_id: null, cantidad: 1,
    }]);
  };

  const addComponenteLine = () => {
    const usados = new Set(recetas.filter(r => r.tipo === 'componente').map(r => r.componente_producto_id));
    const libre  = productos.find((p) => !usados.has(p.id));
    if (!libre) return;
    setRecetas([...recetas, {
      tipo: 'componente', ingrediente_id: null, componente_producto_id: libre.id, cantidad: 1,
    }]);
  };

  const update = (idx: number, patch: Partial<RecetaLinea>) => {
    setRecetas(recetas.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const remove = (idx: number) => setRecetas(recetas.filter((_, i) => i !== idx));

  // "Productos posibles" — sólo cuenta líneas de ingrediente directo
  // (los componentes recursivos los expande el backend; calcular en cliente es complejo)
  const ingLines = recetas.filter(r => r.tipo === 'ingrediente' && r.ingrediente_id);
  const productosPosibles = ingLines.length === 0 ? Infinity : ingLines.reduce((min, r) => {
    const ing = ingMap.get(r.ingrediente_id!);
    if (!ing || r.cantidad <= 0) return min;
    const posible = Math.floor(ing.stock / r.cantidad);
    return Math.min(min, posible);
  }, Infinity);

  const onSave = async () => {
    setErrors({});
    setSaving(true);
    try {
      const limpio = recetas
        .filter((r) => r.cantidad > 0 && (r.ingrediente_id !== null || r.componente_producto_id !== null))
        .map((r) => r.tipo === 'ingrediente'
          ? { ingrediente_id: r.ingrediente_id, cantidad: r.cantidad }
          : { componente_producto_id: r.componente_producto_id, cantidad: r.cantidad },
        );

      await api.put(`/productos/${producto.id}/recetas`, { recetas: limpio });
      toast.success('Receta guardada — el inventario se descontará automáticamente con cada pedido');
      onClose();
    } catch (err: any) {
      const status = err?.response?.status;
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);

      if (status === 403)      toast.error('No tienes permiso para editar recetas de este producto.');
      else if (status === 422) toast.error('Revisa los campos marcados en rojo.');
      else                     toast.error(err?.response?.data?.message ?? 'No se pudo guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Receta — ${producto.nombre}`} size="lg">
      {loading ? (
        <Skeleton className="h-32" />
      ) : ingredientes.length === 0 && productos.length === 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
          <p className="font-medium mb-2">Necesitas inventario primero</p>
          <p className="text-muted mb-3">
            Crea al menos un ingrediente en <strong>Inventario</strong> para definir aquí.
          </p>
          <a href="/admin/inventario" className="inline-block px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-medium">
            Ir a Inventario →
          </a>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-line bg-line/20 p-4 mb-4 text-sm">
            <p>
              Por cada <strong>1 {producto.nombre}</strong> vendido se descontará del{' '}
              <a href="/admin/inventario" className="underline">inventario</a> lo siguiente:
            </p>
            {ingLines.length > 0 && Number.isFinite(productosPosibles) && (
              <p className="mt-2 text-xs">
                <span className="text-muted">Con el stock actual puedes hacer (sólo ingredientes directos):</span>{' '}
                <strong className={cn(productosPosibles === 0 && 'text-red-600')}>
                  {productosPosibles} {producto.nombre}{productosPosibles !== 1 ? 's' : ''}
                </strong>
              </p>
            )}
          </div>

          <ul className="divide-y divide-line border border-line rounded-xl mb-3 overflow-hidden">
            {recetas.map((r, idx) => {
              if (r.tipo === 'ingrediente') {
                const ing = r.ingrediente_id ? ingMap.get(r.ingrediente_id) : null;
                const stockOk = !ing ? true : ing.stock >= r.cantidad;
                const usados = new Set(recetas.map((x, i) =>
                  i === idx || x.tipo !== 'ingrediente' ? -1 : x.ingrediente_id,
                ));
                const opciones = ingredientes.filter((i) => i.id === r.ingrediente_id || !usados.has(i.id));

                return (
                  <li key={idx} className={cn('p-3', !stockOk && 'bg-red-50')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Ingrediente
                      </span>
                      <select
                        value={r.ingrediente_id ?? ''}
                        onChange={(e) => update(idx, { ingrediente_id: Number(e.target.value) })}
                        className="flex-1 min-w-[180px] px-2 py-1.5 border border-line rounded-lg bg-white"
                      >
                        {opciones.map((i) => (
                          <option key={i.id} value={i.id}>{i.nombre} · stock {i.stock} {i.unidad}</option>
                        ))}
                      </select>
                      <input
                        type="number" step="0.001" min={0.001}
                        value={r.cantidad}
                        onChange={(e) => update(idx, { cantidad: Number(e.target.value) })}
                        className={cn(
                          'w-24 px-2 py-1.5 border rounded-lg bg-white text-right',
                          errors[`recetas.${idx}.cantidad`] ? 'border-red-400' : 'border-line',
                        )}
                      />
                      <span className="text-xs text-muted w-8 shrink-0">{ing?.unidad}</span>
                      <Button variant="ghost" size="sm" onClick={() => remove(idx)} aria-label="Quitar">✕</Button>
                    </div>
                    {ing && (
                      <div className="mt-1.5 ml-1 text-xs">
                        <span className="text-muted">Stock actual: </span>
                        <strong className={cn(ing.bajo_stock && 'text-red-600')}>{ing.stock} {ing.unidad}</strong>
                        {!stockOk && (
                          <span className="ml-2 text-red-600 inline-flex items-center gap-1">
                            <Icon name="alert-triangle" size={11} />
                            no alcanza para 1 producto
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              } else {
                // componente compuesto
                const comp   = r.componente_producto_id ? prodMap.get(r.componente_producto_id) : null;
                const usados = new Set(recetas.map((x, i) =>
                  i === idx || x.tipo !== 'componente' ? -1 : x.componente_producto_id,
                ));
                const opciones = productos.filter((p) => p.id === r.componente_producto_id || !usados.has(p.id));

                return (
                  <li key={idx} className="p-3 bg-violet-50/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                        Componente
                      </span>
                      <select
                        value={r.componente_producto_id ?? ''}
                        onChange={(e) => update(idx, { componente_producto_id: Number(e.target.value) })}
                        className="flex-1 min-w-[180px] px-2 py-1.5 border border-line rounded-lg bg-white"
                      >
                        {opciones.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="number" step="1" min={1}
                        value={r.cantidad}
                        onChange={(e) => update(idx, { cantidad: Number(e.target.value) })}
                        className="w-24 px-2 py-1.5 border border-line rounded-lg bg-white text-right"
                      />
                      <span className="text-xs text-muted w-8 shrink-0">pz</span>
                      <Button variant="ghost" size="sm" onClick={() => remove(idx)} aria-label="Quitar">✕</Button>
                    </div>
                    <div className="mt-1.5 ml-1 text-xs text-muted">
                      Expande recursivamente la receta de <strong>{comp?.nombre ?? '?'}</strong> al vender este producto.
                    </div>
                  </li>
                );
              }
            })}
            {recetas.length === 0 && (
              <li className="p-4 text-center text-sm text-muted">
                Sin items asignados. El producto NO descontará inventario al venderse.
              </li>
            )}
          </ul>

          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={addIngredienteLine}
              disabled={ingredientes.length === 0 || recetas.filter(r => r.tipo === 'ingrediente').length >= ingredientes.length}>
              + Ingrediente
            </Button>
            <Button variant="secondary" size="sm" onClick={addComponenteLine}
              disabled={productos.length === 0 || recetas.filter(r => r.tipo === 'componente').length >= productos.length}>
              + Componente (otro producto)
            </Button>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-line">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={onSave} loading={saving}>Guardar receta</Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─────────── Editor de extras / toppings ─────────── */
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
