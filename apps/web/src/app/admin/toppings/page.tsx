'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ToppingGroup } from '@/lib/types';
import { toast } from '@/store/toast';
import { CreateButton, EditButton, DeleteButton } from '@/components/ui/actions';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { InfoBox } from '@/components/ui/InfoBox';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ToppingModal } from '@/components/admin/catalogo/ToppingModal';
import { cn, formatMXN } from '@/lib/utils';

export default function ToppingsPage() {
  const [items, setItems] = useState<ToppingGroup[] | null>(null);
  const [editing, setEditing] = useState<ToppingGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    setItems(null);
    api.get<{ data: ToppingGroup[] }>('/toppings').then(({ data }) => setItems(data.data));
  };
  useEffect(refresh, []);

  const del = async (t: ToppingGroup) => {
    await api.delete(`/toppings/${t.id}`);
    toast.success('Grupo eliminado');
    refresh();
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Toppings"
        kickerIcon="sparkles"
        tourSlug="toppings"
        title="Opciones para"
        titleAccent="personalizar tus platillos."
        description="Crea aquí tus grupos de opciones (Tamaño, Salsas, Extras) una sola vez. Después, al crear un producto, solo los eliges."
        actions={<span data-tour="toppings-nuevo"><CreateButton onClick={() => setCreating(true)} label="Grupo" /></span>}
      />

      {!items ? (
        <div className="space-y-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-8">
          <InfoBox className="mb-4">
            Un <strong>grupo de toppings</strong> es un tipo de elección que el cliente hace al pedir
            (ej. “Tamaño”: Chico / Mediano / Grande, o “Extras”: Queso +$15). Créalo una vez aquí y
            reúsalo en todos los productos que quieras.
          </InfoBox>
          <div className="flex justify-center">
            <CreateButton onClick={() => setCreating(true)} label="Crear mi primer grupo" />
          </div>
        </div>
      ) : (
        <ul data-tour="toppings-lista" className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className={cn('rounded-2xl border-2 p-4 bg-white', t.activo ? 'border-line' : 'border-line opacity-60')}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{t.nombre}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-line/60">
                      {t.kind === 'one' ? 'Elige una' : 'Elige varias'}
                    </span>
                    {t.required && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Obligatorio</span>}
                    {!t.activo && <span className="text-[11px] px-2 py-0.5 rounded-full bg-line/60">Inactivo</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {t.items.map((it, k) => (
                      <span
                        key={k}
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          it.disponible === false ? 'bg-red-50 text-red-600' : 'bg-line/50',
                        )}
                        title={it.disponible === false ? 'Sin ingredientes en inventario' : undefined}
                      >
                        {it.name}{it.price > 0 ? ` +${formatMXN(it.price)}` : ''}
                        {it.disponible === false && ' · agotado'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 justify-end shrink-0">
                  <EditButton onClick={() => setEditing(t)} />
                  <DeleteButton compact onDelete={() => del(t)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(creating || editing) && (
        <ToppingModal
          topping={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

