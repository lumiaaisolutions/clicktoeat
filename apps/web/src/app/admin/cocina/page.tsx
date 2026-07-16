'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface DetallePedido {
  id: number;
  producto_nombre: string;
  cantidad: number;
  notas: string | null;
}

interface PedidoCocina {
  id: number;
  codigo: string;
  estado: 'nuevo' | 'confirmado' | 'preparando' | 'listo';
  mesa?: { etiqueta: string } | null;
  detalles: DetallePedido[];
  created_at: string;
}

const SIGUIENTE_ESTADO: Record<string, string> = {
  nuevo: 'confirmado',
  confirmado: 'preparando',
  preparando: 'listo',
};
const ACCION_LABEL: Record<string, string> = {
  nuevo: 'Confirmar',
  confirmado: 'Empezar a preparar',
  preparando: 'Marcar listo',
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<PedidoCocina[] | null>(null);

  const refresh = async () => {
    const { data } = await api.get<{ data: PedidoCocina[] }>('/salon/cocina/pedidos');
    setPedidos(data.data);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const avanzar = async (p: PedidoCocina) => {
    const nuevoEstado = SIGUIENTE_ESTADO[p.estado];
    if (!nuevoEstado) return;
    try {
      await api.patch(`/pedidos/${p.id}/estado`, { estado: nuevoEstado });
      refresh();
    } catch {
      toast.error('No se pudo actualizar el pedido');
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Salón" kickerIcon="flame"
        title="Cocina" titleAccent="pedidos en preparación."
        description="Se actualiza solo cada 15 segundos."
      />

      {pedidos === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="flame" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Sin pedidos pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pedidos.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="ce-display font-bold text-lg">{p.mesa?.etiqueta ?? p.codigo}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium capitalize">
                  {p.estado}
                </span>
              </div>
              <ul className="text-sm space-y-1">
                {p.detalles.map((d) => (
                  <li key={d.id}>
                    <span className="font-semibold">{d.cantidad}×</span> {d.producto_nombre}
                    {d.notas && <span className="block text-xs text-muted pl-4">"{d.notas}"</span>}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-2">
                {SIGUIENTE_ESTADO[p.estado] && (
                  <Button size="sm" onClick={() => avanzar(p)}>
                    {ACCION_LABEL[p.estado]}
                  </Button>
                )}
                <a href={`/admin/cocina/comanda/${p.id}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">Imprimir comanda</Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
