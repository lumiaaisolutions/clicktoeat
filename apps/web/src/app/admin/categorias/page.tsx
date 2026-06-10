'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export default function CategoriasPage() {
  const [items, setItems] = useState<Categoria[] | null>(null);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<{ data: Categoria[] }>('/categorias');
    setItems(data.data);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (cat: Categoria) => {
    if (!confirm(`¿Eliminar "${cat.nombre}"?`)) return;
    try {
      await api.delete(`/categorias/${cat.id}`);
      toast.success('Categoría eliminada');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Categorías</h1>
          <p className="text-muted text-sm mt-1">Organiza el menú en secciones.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nueva</Button>
      </header>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          No tienes categorías todavía.
        </div>
      ) : (
        <>
          {/* ─── Móvil: cards apiladas ─── */}
          <div className="md:hidden space-y-2">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{c.nombre}</p>
                      <span className={c.activo ? 'text-emerald-600' : 'text-muted'}>
                        {c.activo ? '●' : '○'}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-1 truncate">{c.slug}</p>
                    <p className="text-xs text-muted mt-1">
                      {c.productos_count ?? 0} productos · orden {c.orden}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-line">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(c)} className="flex-1">Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="flex-1">Borrar</Button>
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
                  <th className="text-left px-4 py-3">Slug</th>
                  <th className="text-right px-4 py-3">Productos</th>
                  <th className="text-right px-4 py-3">Orden</th>
                  <th className="text-center px-4 py-3">Activa</th>
                  <th className="text-right px-4 py-3 w-1" />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium">{c.nombre}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{c.slug}</td>
                    <td className="px-4 py-3 text-right">{c.productos_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">{c.orden}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={c.activo ? 'text-emerald-600' : 'text-muted'}>
                        {c.activo ? '●' : '○'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>Borrar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CategoriaModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); refresh(); }}
      />
      <CategoriaModal
        open={!!editing}
        categoria={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); }}
      />
    </div>
  );
}

function CategoriaModal({
  open, onClose, onSaved, categoria,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categoria?: Categoria;
}) {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('');
  const [orden, setOrden] = useState(0);
  const [activo, setActivo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre(categoria?.nombre ?? '');
      setIcono(categoria?.icono ?? '');
      setOrden(categoria?.orden ?? 0);
      setActivo(categoria?.activo ?? true);
      setErrors({});
    }
  }, [open, categoria]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload = { nombre, icono: icono || null, orden, activo };
      if (categoria) {
        await api.patch<Resource<Categoria>>(`/categorias/${categoria.id}`, payload);
        toast.success('Categoría actualizada');
      } else {
        await api.post<Resource<Categoria>>('/categorias', payload);
        toast.success('Categoría creada');
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
    <Modal open={open} onClose={onClose} title={categoria ? 'Editar categoría' : 'Nueva categoría'}>
      <form onSubmit={onSubmit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} error={errors.nombre} required maxLength={80} />
        <Field label="Icono (font-awesome)" value={icono} onChange={(e) => setIcono(e.target.value)} hint="p.ej. fa-pizza-slice" error={errors.icono} />
        <Field label="Orden" type="number" value={orden} onChange={(e) => setOrden(Number(e.target.value))} error={errors.orden} />
        <Switch label="Activa" hint="Si se desactiva, no aparece en la landing pública" checked={activo} onChange={setActivo} />

        <div className="flex gap-2 justify-end mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
