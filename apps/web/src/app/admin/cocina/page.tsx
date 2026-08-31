'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { playChime } from '@/lib/chime';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface DetallePedido {
  id: number;
  producto_nombre: string;
  cantidad: number;
  notas: string | null;
  estado?: 'pendiente' | 'listo';
}

const SLA_MINUTOS = 15; // umbral para marcar un pedido como atrasado

function minutosDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
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
const ESTADO_COLOR: Record<PedidoCocina['estado'], string> = {
  nuevo: 'bg-slate-100 text-slate-700',
  confirmado: 'bg-blue-100 text-blue-700',
  preparando: 'bg-amber-100 text-amber-700',
  listo: 'bg-emerald-100 text-emerald-700',
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<PedidoCocina[] | null>(null);
  const conocidos = useRef<Set<number> | null>(null);

  const refresh = async () => {
    const { data } = await api.get<{ data: PedidoCocina[] }>('/salon/cocina/pedidos');
    const ids = data.data.map((p) => p.id);
    if (conocidos.current === null) {
      conocidos.current = new Set(ids); // primera carga: no suena
    } else {
      const nuevos = ids.filter((id) => !conocidos.current!.has(id));
      if (nuevos.length > 0) {
        playChime();
        toast.success(nuevos.length === 1 ? 'Nuevo pedido en cocina' : `${nuevos.length} pedidos nuevos`);
      }
      conocidos.current = new Set(ids);
    }
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

  const toggleItem = async (d: DetallePedido) => {
    const nuevo = d.estado === 'listo' ? 'pendiente' : 'listo';
    try {
      await api.patch(`/detalle-pedidos/${d.id}/estado`, { estado: nuevo });
      refresh();
    } catch {
      toast.error('No se pudo actualizar el platillo');
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
          {pedidos.map((p) => {
            const mins = minutosDesde(p.created_at);
            const atrasado = mins >= SLA_MINUTOS && p.estado !== 'listo';
            return (
            <div key={p.id} className={`rounded-2xl border bg-white p-4 flex flex-col gap-3 ${atrasado ? 'border-red-400 ring-1 ring-red-300' : 'border-line'}`}>
              <div className="flex items-center justify-between">
                <span className="ce-display font-bold text-lg">{p.mesa?.etiqueta ?? p.codigo}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${atrasado ? 'text-red-600' : 'text-muted'}`}>
                    {atrasado ? `⏱ ${mins} min` : `${mins} min`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_COLOR[p.estado]}`}>
                    {p.estado}
                  </span>
                </div>
              </div>
              <ul className="text-sm space-y-1">
                {p.detalles.map((d) => {
                  const listo = d.estado === 'listo';
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => toggleItem(d)}
                        className={`flex items-start gap-2 text-left w-full ${listo ? 'text-muted line-through' : ''}`}
                      >
                        <Icon name={listo ? 'check-circle' : 'circle'} size={16} className={listo ? 'text-emerald-500 mt-0.5 shrink-0' : 'text-line mt-0.5 shrink-0'} />
                        <span><span className="font-semibold">{d.cantidad}×</span> {d.producto_nombre}</span>
                      </button>
                      {d.notas && <span className="block text-xs text-muted pl-6">"{d.notas}"</span>}
                    </li>
                  );
                })}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
