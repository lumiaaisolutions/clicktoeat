'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated, Pedido, PedidoEstado, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMXN, cn } from '@/lib/utils';

const ESTADOS: { value: PedidoEstado | ''; label: string }[] = [
  { value: '',           label: 'Todos' },
  { value: 'nuevo',      label: 'Nuevos' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'preparando', label: 'Preparando' },
  { value: 'listo',      label: 'Listos' },
  { value: 'en_camino',  label: 'En camino' },
  { value: 'entregado',  label: 'Entregados' },
  { value: 'cancelado',  label: 'Cancelados' },
];

const ESTADO_COLOR: Record<PedidoEstado, string> = {
  nuevo:      'bg-blue-100 text-blue-700',
  confirmado: 'bg-indigo-100 text-indigo-700',
  preparando: 'bg-amber-100 text-amber-700',
  listo:      'bg-teal-100 text-teal-700',
  en_camino:  'bg-violet-100 text-violet-700',
  entregado:  'bg-emerald-100 text-emerald-700',
  cancelado:  'bg-red-100 text-red-700',
};

const TRANSICIONES: Record<PedidoEstado, PedidoEstado[]> = {
  nuevo:      ['confirmado', 'cancelado'],
  confirmado: ['preparando', 'cancelado'],
  preparando: ['listo', 'cancelado'],
  listo:      ['en_camino', 'entregado', 'cancelado'],
  en_camino:  ['entregado', 'cancelado'],
  entregado:  [],
  cancelado:  [],
};

export default function PedidosPage() {
  const [items, setItems] = useState<Pedido[] | null>(null);
  const [estado, setEstado] = useState<PedidoEstado | ''>('');
  const [open, setOpen] = useState<Pedido | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<Paginated<Pedido>>('/pedidos', {
      params: { estado: estado || undefined, per_page: 50 },
    });
    setItems(data.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [estado]);

  // Poll cada 30s en /admin/pedidos para refrescar (sustituto sin WebSockets de Fase 6)
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  /* eslint-disable-next-line */
  }, [estado]);

  const changeEstado = async (p: Pedido, nuevo: PedidoEstado) => {
    try {
      const { data } = await api.patch<Resource<Pedido>>(`/pedidos/${p.id}/estado`, { estado: nuevo });
      toast.success(`Pedido ${data.data.codigo}: ${nuevo}`);
      refresh();
      if (open?.id === p.id) setOpen(data.data);
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Pedidos</h1>
          <p className="text-muted text-sm mt-1">Auto-refresca cada 30s. Cambia el estado para que aparezca en cocina.</p>
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as PedidoEstado | '')}
          className="px-3 py-2 border border-line rounded-xl bg-white"
        >
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </header>

      <div className="rounded-2xl border border-line bg-white overflow-hidden">
        {items === null ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-muted text-sm">No hay pedidos en este estado.</div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((p) => (
              <li key={p.id} className="p-4 hover:bg-line/20 cursor-pointer" onClick={() => setOpen(p)}>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ESTADO_COLOR[p.estado])}>
                    {p.estado}
                  </span>
                  <span className="font-mono text-xs text-muted">{p.codigo}</span>
                  <span className="font-medium">{p.cliente_nombre}</span>
                  <span className="text-sm text-muted">· {p.cliente_telefono}</span>
                  <span className="ml-auto font-bold">{formatMXN(p.total)}</span>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {labelEntrega(p.metodo_entrega)} · {p.metodo_pago.replace('_', ' ')} · {new Date(p.created_at).toLocaleString('es-MX')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Pedido ${open?.codigo ?? ''}`} size="lg">
        {open && <PedidoDetalle pedido={open} onChange={changeEstado} />}
      </Modal>
    </div>
  );
}

function labelEntrega(m: Pedido['metodo_entrega']): string {
  return { pickup: 'Recoger', delivery: 'Entrega', sucursal: 'Sucursal' }[m] ?? m;
}

function PedidoDetalle({
  pedido, onChange,
}: { pedido: Pedido; onChange: (p: Pedido, next: PedidoEstado) => void }) {
  const [detalles, setDetalles] = useState(pedido.detalles ?? []);
  useEffect(() => {
    if (!pedido.detalles?.length) {
      api.get<Resource<Pedido>>(`/pedidos/${pedido.id}`).then(({ data }) => setDetalles(data.data.detalles ?? []));
    } else {
      setDetalles(pedido.detalles);
    }
  }, [pedido.id, pedido.detalles]);

  const transiciones = TRANSICIONES[pedido.estado] ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ESTADO_COLOR[pedido.estado])}>
          {pedido.estado}
        </span>
        {transiciones.length === 0 ? (
          <span className="text-xs text-muted">Estado final</span>
        ) : (
          transiciones.map((t) => (
            <Button key={t} size="sm" variant="secondary" onClick={() => onChange(pedido, t)}>
              → {t.replace('_', ' ')}
            </Button>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-xs uppercase text-muted">Cliente</p>
          <p className="font-medium">{pedido.cliente_nombre}</p>
          <p>{pedido.cliente_telefono}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Entrega</p>
          <p className="font-medium">{pedido.metodo_entrega === 'delivery' ? 'A domicilio' : 'Recoger en sucursal'}</p>
          {pedido.direccion && <p>{pedido.direccion}</p>}
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Pago</p>
          <p>{pedido.metodo_pago.replace('_', ' ')}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Total</p>
          <p className="font-bold text-lg">{formatMXN(pedido.total)}</p>
        </div>
      </div>

      <h3 className="ce-display font-bold mb-2">Items</h3>
      <ul className="divide-y divide-line border border-line rounded-xl">
        {detalles.map((d) => (
          <li key={d.id} className="p-3 text-sm">
            <div className="flex justify-between">
              <span>{d.cantidad}× {d.producto_nombre}</span>
              <span>{formatMXN(d.subtotal)}</span>
            </div>
            {d.extras_seleccionados.length > 0 && (
              <ul className="mt-1 text-xs text-muted ml-4 list-disc">
                {d.extras_seleccionados.map((e, i) => (
                  <li key={i}>{e.group}: {e.item}{e.price > 0 ? ` (+${formatMXN(e.price)})` : ''}</li>
                ))}
              </ul>
            )}
            {d.notas && <p className="text-xs italic text-muted mt-1">"{d.notas}"</p>}
          </li>
        ))}
      </ul>

      {pedido.whatsapp_url && (
        <a
          href={pedido.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: '#25D366' }}
        >
          Reenviar a WhatsApp ↗
        </a>
      )}
    </div>
  );
}
