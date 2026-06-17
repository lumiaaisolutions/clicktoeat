'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated, Pedido, PedidoEstado, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
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

// Avances "naturales" — flujo normal del pedido
const TRANSICIONES: Record<PedidoEstado, PedidoEstado[]> = {
  nuevo:      ['confirmado', 'cancelado'],
  confirmado: ['preparando', 'cancelado'],
  preparando: ['listo', 'cancelado'],
  listo:      ['en_camino', 'entregado', 'cancelado'],
  en_camino:  ['entregado', 'cancelado'],
  entregado:  [],
  cancelado:  [],
};

// F100 — Retrocesos permitidos por si el owner se equivocó al avanzar el estado.
// Útil para "ups, no era entregado, era listo".
const TRANSICIONES_ATRAS: Record<PedidoEstado, PedidoEstado[]> = {
  nuevo:      [],
  confirmado: ['nuevo'],
  preparando: ['confirmado'],
  listo:      ['preparando'],
  en_camino:  ['listo'],
  entregado:  ['en_camino', 'listo'],
  cancelado:  ['nuevo'],
};

export default function PedidosPage() {
  const [items, setItems] = useState<Pedido[] | null>(null);
  const [estado, setEstado] = useState<PedidoEstado | ''>('');
  const [trashed, setTrashed] = useState<'' | 'only' | 'with'>('');
  const [open, setOpen] = useState<Pedido | null>(null);

  const refresh = async () => {
    setItems(null);
    const { data } = await api.get<Paginated<Pedido>>('/pedidos', {
      params: {
        estado: estado || undefined,
        trashed: trashed || undefined,
        per_page: 50,
      },
    });
    setItems(data.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [estado, trashed]);

  // Poll cada 30s en /admin/pedidos para refrescar (sustituto sin WebSockets — pendiente Reverb)
  useEffect(() => {
    if (trashed) return;        // no polling cuando ves eliminados
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  /* eslint-disable-next-line */
  }, [estado, trashed]);

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

  const handleRestore = async (p: Pedido) => {
    try {
      await api.post(`/pedidos/${p.id}/restore`);
      toast.success(`Pedido ${p.codigo} restaurado`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo restaurar');
    }
  };

  /**
   * F100 — Abre el modal de "Link de calificación" del pedido entregado.
   * Si el token ya viene en `pedido.review_token`, se usa directo (caso normal).
   * Si NO viene (pedidos legacy o entregados saltando estados), llamamos a
   * POST /admin/pedidos/{id}/review-link que lo crea on-demand y devuelve el
   * token. Así nunca se queda el owner sin poder mandar la calificación.
   */
  const [linkCalifPedido, setLinkCalifPedido] = useState<Pedido | null>(null);
  const [generandoLink, setGenerandoLink] = useState<number | null>(null);
  const abrirLinkCalificacion = async (p: Pedido) => {
    if (p.review_token) {
      setLinkCalifPedido(p);
      return;
    }
    setGenerandoLink(p.id);
    try {
      const { data } = await api.post<{ token: string }>(`/admin/pedidos/${p.id}/review-link`);
      const enriched: Pedido = { ...p, review_token: data.token };
      setItems((prev) => prev?.map((it) => it.id === p.id ? enriched : it) ?? prev);
      setLinkCalifPedido(enriched);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo generar el link de calificación');
    } finally {
      setGenerandoLink(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Pedidos"
        kickerIcon="bell"
        title="Lo que tus clientes"
        titleAccent="están pidiendo."
        description="Se actualizan solos cada 30 segundos. Cambia el estado conforme avanza la preparación."
        tourSlug="pedidos"
        actions={
          <div data-tour="pedidos-filtros" className="flex gap-2 flex-wrap">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as PedidoEstado | '')}
              className="px-3 py-2 border border-line rounded-xl bg-white text-sm"
            >
              {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <select
              value={trashed}
              onChange={(e) => setTrashed(e.target.value as '' | 'only' | 'with')}
              className="px-3 py-2 border border-line rounded-xl bg-white text-sm"
              title="Filtro de pedidos eliminados"
            >
              <option value="">Activos</option>
              <option value="with">Activos + eliminados</option>
              <option value="only">Sólo eliminados</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                try {
                  const { downloadFile } = await import('@/lib/api');
                  await downloadFile('/pedidos/export', estado ? { estado } : undefined);
                } catch { toast.error('No se pudo exportar'); }
              }}
            >
              Exportar CSV
            </Button>
          </div>
        }
      />

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
              <li
                key={p.id}
                className={cn('p-4', trashed !== 'only' && 'hover:bg-line/20 cursor-pointer')}
                onClick={trashed === 'only' ? undefined : () => setOpen(p)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ESTADO_COLOR[p.estado])}>
                    {p.estado}
                  </span>
                  <span className="font-mono text-xs text-muted">{p.codigo}</span>
                  <span className="font-medium">{p.cliente_nombre}</span>
                  <span className="text-sm text-muted">· {p.cliente_telefono}</span>
                  {p.lealtad_premio_listo && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                      <Icon name="gift" size={10} /> Premio listo — regálale algo
                    </span>
                  )}
                  <span className="ml-auto font-bold">{formatMXN(p.total)}</span>
                  {/* F100 — Botón "Cambiar estado" para owners que quieren cambiar rápido sin abrir el detalle */}
                  {trashed !== 'only' && p.estado !== 'entregado' && p.estado !== 'cancelado' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpen(p); }}
                      className="text-xs px-2 py-1 rounded-full border border-line hover:bg-line/40 inline-flex items-center gap-1"
                      title="Cambiar el estado del pedido"
                    >
                      <Icon name="settings" size={10} />
                      Cambiar estado
                    </button>
                  )}
                  {p.estado === 'entregado' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirLinkCalificacion(p); }}
                      disabled={generandoLink === p.id}
                      className="text-xs px-2 py-1 rounded-full border border-line hover:bg-amber-50 hover:border-amber-300 inline-flex items-center gap-1 disabled:opacity-60"
                      title="Manda este link al cliente por WhatsApp para que califique"
                    >
                      <Icon name="star" size={10} className={generandoLink === p.id ? 'animate-pulse' : ''} />
                      {generandoLink === p.id ? 'Generando…' : 'Link de calificación'}
                    </button>
                  )}
                  {trashed === 'only' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(p); }}
                      className="text-xs px-2 py-1 rounded-full border border-line hover:bg-bg"
                    >
                      ↺ Restaurar
                    </button>
                  )}
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

      <Modal open={!!linkCalifPedido} onClose={() => setLinkCalifPedido(null)} title="Link de calificación" size="md">
        {linkCalifPedido && <LinkCalificacionModal pedido={linkCalifPedido} onClose={() => setLinkCalifPedido(null)} />}
      </Modal>
    </div>
  );
}

function LinkCalificacionModal({ pedido, onClose }: { pedido: Pedido; onClose: () => void }) {
  const FRONTEND = process.env.NEXT_PUBLIC_FRONTEND_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const link = `${FRONTEND}/review/${pedido.review_token}`;
  const mensaje = `Hola ${pedido.cliente_nombre} 👋 ¡Gracias por tu pedido en nuestro local! Nos encantaría saber qué te pareció. Califícanos en 30 segundos aquí: ${link}`;
  const telefonoLimpio = (pedido.cliente_telefono || '').replace(/\D/g, '');
  const waUrl = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copiado al portapapeles');
    } catch { toast.error('No se pudo copiar'); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Manda este link al cliente por WhatsApp. Cuando lo abra, podrá calificarte 1-5 estrellas y dejar un comentario.
      </p>

      <div className="rounded-xl border border-line bg-line/20 p-3 break-all text-xs font-mono">{link}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition tap-target"
        >
          <Icon name="whatsapp" size={16} />
          {telefonoLimpio ? 'Abrir WhatsApp del cliente' : 'Mandar por WhatsApp'}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-line bg-white text-sm font-semibold hover:border-ink/30 transition"
        >
          <Icon name="copy" size={14} />
          Copiar solo el link
        </button>
      </div>

      <details className="rounded-xl border border-line bg-white p-3 text-xs">
        <summary className="cursor-pointer font-semibold">Vista previa del mensaje</summary>
        <p className="text-muted mt-2 leading-relaxed whitespace-pre-wrap">{mensaje}</p>
      </details>

      <button type="button" onClick={onClose} className="w-full text-center text-xs text-muted hover:text-ink py-2">Cerrar</button>
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
  const retrocesos   = TRANSICIONES_ATRAS[pedido.estado] ?? [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', ESTADO_COLOR[pedido.estado])}>
          {pedido.estado}
        </span>
        {transiciones.length === 0 && retrocesos.length === 0 && (
          <span className="text-xs text-muted">Estado final</span>
        )}
        {transiciones.map((t) => (
          <Button key={t} size="sm" variant="secondary" onClick={() => onChange(pedido, t)}>
            → {t.replace('_', ' ')}
          </Button>
        ))}
        {retrocesos.length > 0 && (
          <>
            <span className="text-[10px] text-muted uppercase tracking-wider ml-2">¿Te equivocaste?</span>
            {retrocesos.map((t) => (
              <Button key={t} size="sm" variant="ghost" onClick={() => {
                if (confirm(`Regresar el estado a "${t.replace('_', ' ')}"? Solo úsalo si avanzaste por error.`)) {
                  onChange(pedido, t);
                }
              }}>
                ← {t.replace('_', ' ')}
              </Button>
            ))}
          </>
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
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: '#25D366' }}
        >
          <Icon name="whatsapp" size={15} />
          Reenviar a WhatsApp
          <Icon name="arrow-up-right" size={14} />
        </a>
      )}
    </div>
  );
}
