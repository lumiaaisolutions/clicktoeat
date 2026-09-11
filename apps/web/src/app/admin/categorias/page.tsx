'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Categoria, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconPicker } from '@/components/ui/IconPicker';
import { Icon, type IconName } from '@/components/ui/Icon';
import { CategoriaModal } from '@/components/admin/catalogo/CategoriaModal';

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
      <AdminPageHeader
        kicker="Categorías"
        kickerIcon="list"
        title="Organiza tu menú"
        titleAccent="en secciones."
        description="Las categorías son las secciones de tu menú (Tacos, Bebidas, Postres). Agrupan tus platillos para que tus clientes encuentren todo fácil."
        tourSlug="categorias"
        actions={
          <Button data-tour="categorias-nuevo" onClick={() => setCreating(true)}>+ Nueva categoría</Button>
        }
      />

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
                  <Button data-tour="categoria-borrar-mobile" variant="ghost" size="sm" onClick={() => handleDelete(c)} className="flex-1">Borrar</Button>
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
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        {c.icono && (
                          <span className="w-7 h-7 rounded-lg bg-[color:var(--ce-bg)] border border-line grid place-items-center text-ink/70 shrink-0">
                            <Icon name={c.icono as IconName} size={14} />
                          </span>
                        )}
                        {c.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{c.slug}</td>
                    <td className="px-4 py-3 text-right">{c.productos_count ?? 0}</td>
                    <td className="px-4 py-3 text-right">{c.orden}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={c.activo ? 'text-emerald-600' : 'text-muted'}>
                        {c.activo ? '●' : '○'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button data-tour="categoria-editar" variant="ghost" size="sm" onClick={() => setEditing(c)}>Editar</Button>
                      <Button data-tour="categoria-borrar" variant="ghost" size="sm" onClick={() => handleDelete(c)}>Borrar</Button>
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

