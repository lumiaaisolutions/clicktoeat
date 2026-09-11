'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ToppingGroup } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { InfoBox } from '@/components/ui/InfoBox';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
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
    if (!confirm(`¿Eliminar el grupo "${t.nombre}"? Los productos que ya lo tienen no se ven afectados.`)) return;
    await api.delete(`/toppings/${t.id}`);
    toast.success('Grupo eliminado');
    refresh();
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Toppings"
        kickerIcon="sparkles"
        title="Opciones para"
        titleAccent="personalizar tus platillos."
        description="Crea aquí tus grupos de opciones (Tamaño, Salsas, Extras) una sola vez. Después, al crear un producto, solo los eliges."
        actions={<Button onClick={() => setCreating(true)}><Icon name="plus" size={14} className="mr-1.5" />Nuevo grupo</Button>}
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
          <div className="text-center">
            <Button onClick={() => setCreating(true)}>Crear mi primer grupo</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
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
                  <p className="text-sm text-muted mt-1">
                    {t.items.map((it) => it.price > 0 ? `${it.name} +${formatMXN(it.price)}` : it.name).join(' · ')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(t)} className="px-3 h-9 rounded-lg text-sm font-medium hover:bg-line/50">Editar</button>
                  <button onClick={() => del(t)} className="px-3 h-9 rounded-lg text-sm font-medium hover:bg-red-50 text-red-600">Borrar</button>
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

