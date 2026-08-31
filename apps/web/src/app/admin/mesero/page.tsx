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

interface Mesa {
  id: number;
  etiqueta: string;
  estado: 'libre' | 'ocupada' | 'por_cobrar' | 'reservada' | 'limpieza';
  atendido_por: number | null;
  atiende: string | null;
}

const ESTADO_MESA: Record<Mesa['estado'], { dot: string; label: string }> = {
  libre: { dot: 'bg-emerald-500', label: 'Libre' },
  ocupada: { dot: 'bg-amber-500', label: 'Ocupada' },
  por_cobrar: { dot: 'bg-red-500', label: 'Por cobrar' },
  reservada: { dot: 'bg-indigo-500', label: 'Reservada' },
  limpieza: { dot: 'bg-slate-500', label: 'Limpieza' },
};

export default function MeseroPage() {
  const [pedidos, setPedidos] = useState<PedidoListo[] | null>(null);
  const [llamados, setLlamados] = useState<Llamado[] | null>(null);
  const [mesas, setMesas] = useState<Mesa[] | null>(null);
  const llamadosConocidos = useRef<Set<number> | null>(null);

  const refresh = async () => {
    const [pedidosRes, llamadosRes, mesasRes] = await Promise.all([
      api.get<{ data: PedidoListo[] }>('/salon/mesero/pedidos'),
      api.get<{ data: Llamado[] }>('/salon/llamados'),
      api.get<{ data: Mesa[] }>('/mesas'),
    ]);

    const llamadoIds = llamadosRes.data.data.map((l) => l.id);
    if (llamadosConocidos.current === null) {
      llamadosConocidos.current = new Set(llamadoIds);
    } else {
      const nuevos = llamadoIds.filter((id) => !llamadosConocidos.current!.has(id));
      if (nuevos.length > 0) {
        playChime();
        toast.info('Una mesa está llamando');
      }
      llamadosConocidos.current = new Set(llamadoIds);
    }

    setPedidos(pedidosRes.data.data);
    setLlamados(llamadosRes.data.data);
    setMesas(mesasRes.data.data);
  };

  const tomarMesa = async (m: Mesa) => {
    try {
      await api.post(`/mesas/${m.id}/tomar`);
      toast.success(`Tomaste ${m.etiqueta}`);
      refresh();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'No se pudo tomar la mesa');
    }
  };

  const liberarMesa = async (m: Mesa) => {
    try {
      await api.post(`/mesas/${m.id}/liberar`);
      refresh();
    } catch {
      toast.error('No se pudo liberar la mesa');
    }
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

  const loading = pedidos === null || llamados === null || mesas === null;

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
            <h3 className="ce-display font-bold mb-2">Mesas del salón</h3>
            {mesas!.length === 0 ? (
              <p className="text-sm text-muted">No hay mesas configuradas.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {mesas!.map((m) => {
                  const est = ESTADO_MESA[m.estado];
                  return (
                    <div key={m.id} className="rounded-xl border border-line bg-white p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${est.dot}`} />
                        <span className="font-semibold text-sm">{m.etiqueta}</span>
                        <span className="text-[11px] text-muted ml-auto">{est.label}</span>
                      </div>
                      {m.atendido_por ? (
                        <>
                          <p className="text-xs text-muted">Atiende: <span className="font-medium text-ink">{m.atiende}</span></p>
                          <Button size="sm" variant="ghost" onClick={() => liberarMesa(m)}>Liberar</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => tomarMesa(m)}>Tomar control</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

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
