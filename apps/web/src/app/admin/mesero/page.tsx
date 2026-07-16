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
}

interface PedidoListo {
  id: number;
  codigo: string;
  mesa?: { etiqueta: string } | null;
  detalles: DetallePedido[];
}

interface Llamado {
  id: number;
  mesa: string | null;
  mesa_id: number;
  created_at: string;
}

export default function MeseroPage() {
  const [pedidos, setPedidos] = useState<PedidoListo[] | null>(null);
  const [llamados, setLlamados] = useState<Llamado[] | null>(null);

  const refresh = async () => {
    const [pedidosRes, llamadosRes] = await Promise.all([
      api.get<{ data: PedidoListo[] }>('/salon/mesero/pedidos'),
      api.get<{ data: Llamado[] }>('/salon/llamados'),
    ]);
    setPedidos(pedidosRes.data.data);
    setLlamados(llamadosRes.data.data);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const entregar = async (p: PedidoListo) => {
    try {
      await api.patch(`/pedidos/${p.id}/estado`, { estado: 'entregado' });
      refresh();
    } catch {
      toast.error('No se pudo marcar como entregado');
    }
  };

  const atender = async (l: Llamado) => {
    try {
      await api.post(`/salon/llamados/${l.id}/atender`);
      refresh();
    } catch {
      toast.error('No se pudo marcar como atendido');
    }
  };

  const loading = pedidos === null || llamados === null;

  return (
    <div>
      <AdminPageHeader
        kicker="Salón" kickerIcon="bell"
        title="Mesero" titleAccent="llamados y entregas."
        description="Se actualiza solo cada 15 segundos."
      />

      {loading ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="ce-display font-bold mb-2">Llamados pendientes</h3>
            {llamados!.length === 0 ? (
              <p className="text-sm text-muted">Nadie está llamando.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {llamados!.map((l) => (
                  <div key={l.id} className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon name="bell" size={16} className="text-amber-600" />
                      <span className="font-semibold text-sm">{l.mesa ?? `Mesa #${l.mesa_id}`}</span>
                    </div>
                    <Button size="sm" onClick={() => atender(l)}>Atender</Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="ce-display font-bold mb-2">Listos para entregar</h3>
            {pedidos!.length === 0 ? (
              <div className="rounded-3xl border border-line bg-white p-10 text-center">
                <Icon name="check-circle" size={28} className="text-muted mx-auto" />
                <p className="ce-display text-xl font-bold mt-3">Nada por entregar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pedidos!.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-line bg-white p-4 flex flex-col gap-3">
                    <span className="ce-display font-bold text-lg">{p.mesa?.etiqueta ?? p.codigo}</span>
                    <ul className="text-sm space-y-1">
                      {p.detalles.map((d) => (
                        <li key={d.id}><span className="font-semibold">{d.cantidad}×</span> {d.producto_nombre}</li>
                      ))}
                    </ul>
                    <Button size="sm" onClick={() => entregar(p)} className="mt-auto">Marcar entregado</Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
