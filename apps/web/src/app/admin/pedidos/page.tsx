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

// Color del avatar circular en la card del pedido (más claro/saturado que el badge)
const ESTADO_AVATAR: Record<PedidoEstado, string> = {
  nuevo:      'bg-blue-50 text-blue-600',
  confirmado: 'bg-indigo-50 text-indigo-600',
  preparando: 'bg-amber-50 text-amber-600',
  listo:      'bg-teal-50 text-teal-600',
  en_camino:  'bg-violet-50 text-violet-600',
  entregado:  'bg-emerald-50 text-emerald-600',
  cancelado:  'bg-red-50 text-red-600',
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

  // Doble confirmación para force-delete. El primer click abre el modal con
  // el código del pedido; el segundo confirma. Sin shortcuts: nada de
  // confirm() nativo porque en mobile algunos browsers lo bloquean.
  const [borrarPedido, setBorrarPedido] = useState<Pedido | null>(null);
  const [borrandoPedido, setBorrandoPedido] = useState(false);
  const confirmarBorrar = async () => {
    if (!borrarPedido) return;
    setBorrandoPedido(true);
    try {
      await api.delete(`/pedidos/${borrarPedido.id}/force`);
      toast.success(`Pedido ${borrarPedido.codigo} eliminado`);
      setBorrarPedido(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo borrar');
    } finally {
      setBorrandoPedido(false);
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

      {items === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          No hay pedidos en este estado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((p) => {
            const iniciales = (p.cliente_nombre || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
            const colorAvatar = ESTADO_AVATAR[p.estado] ?? 'bg-zinc-100 text-zinc-700';
            return (
              <article
                key={p.id}
                className={cn(
                  'group rounded-2xl border border-line bg-white p-4 transition-shadow',
                  trashed !== 'only' && 'cursor-pointer hover:border-ink/30 hover:shadow-soft',
                )}
                onClick={trashed === 'only' ? undefined : () => setOpen(p)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('shrink-0 w-11 h-11 rounded-full grid place-items-center text-sm font-bold ring-2 ring-white shadow-soft', colorAvatar)}>
                    {iniciales}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate">{p.cliente_nombre}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider', ESTADO_COLOR[p.estado])}>
                        {p.estado}
                      </span>
                      {p.lealtad_premio_listo && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                          <Icon name="gift" size={10} /> Premio
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{p.codigo}</span>
                      {p.cliente_telefono && <span>· {p.cliente_telefono}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-extrabold text-lg leading-none">{formatMXN(p.total)}</div>
                    <div className="text-[10px] text-muted mt-1 uppercase tracking-wider">{labelEntrega(p.metodo_entrega)}</div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-line flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-muted">
                    {p.metodo_pago.replace('_', ' ')} · {new Date(p.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <div className="ml-auto flex gap-1.5 flex-wrap">
                    {trashed !== 'only' && p.estado !== 'entregado' && p.estado !== 'cancelado' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpen(p); }}
                        className="px-2.5 py-1 rounded-full border border-line hover:bg-line/40 inline-flex items-center gap-1"
                        title="Cambiar el estado del pedido"
                      >
                        <Icon name="settings" size={10} />
                        Estado
                      </button>
                    )}
                    {p.estado === 'entregado' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirLinkCalificacion(p); }}
                        disabled={generandoLink === p.id}
                        className="px-2.5 py-1 rounded-full border border-line hover:bg-amber-50 hover:border-amber-300 inline-flex items-center gap-1 disabled:opacity-60"
                        title="Manda este link al cliente por WhatsApp para que califique"
                      >
                        <Icon name="star" size={10} className={generandoLink === p.id ? 'animate-pulse' : ''} />
                        {generandoLink === p.id ? 'Generando…' : 'Calificación'}
                      </button>
                    )}
                    {trashed === 'only' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRestore(p); }}
                        className="px-2.5 py-1 rounded-full border border-line hover:bg-bg"
                      >
                        ↺ Restaurar
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setBorrarPedido(p); }}
                      className="px-2.5 py-1 rounded-full border border-red-200 bg-white text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                      title="Borrar permanentemente (sin restauración)"
                    >
                      <Icon name="x" size={10} />
                      Borrar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={`Pedido ${open?.codigo ?? ''}`} size="lg">
        {open && <PedidoDetalle pedido={open} onChange={changeEstado} />}
      </Modal>

      <Modal open={!!linkCalifPedido} onClose={() => setLinkCalifPedido(null)} title="Link de calificación" size="md">
        {linkCalifPedido && <LinkCalificacionModal pedido={linkCalifPedido} onClose={() => setLinkCalifPedido(null)} />}
      </Modal>

      <Modal open={!!borrarPedido} onClose={() => setBorrarPedido(null)} title="¿Borrar este pedido?" size="sm">
        {borrarPedido && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-red-100 grid place-items-center">
                  <Icon name="alert-triangle" size={16} className="text-red-600" />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-red-900">Esta acción NO se puede deshacer.</p>
                  <p className="text-red-800 mt-1">
                    El pedido se eliminará permanentemente, incluyendo todos sus detalles. No aparecerá en la papelera ni en reportes.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-white p-3 text-sm">
              <p><span className="text-muted">Folio:</span> <span className="font-mono">{borrarPedido.codigo}</span></p>
              <p><span className="text-muted">Cliente:</span> {borrarPedido.cliente_nombre}</p>
              <p><span className="text-muted">Total:</span> {formatMXN(borrarPedido.total)}</p>
            </div>

            <p className="text-xs text-muted">
              Úsalo solo para pedidos de prueba o creados por error. Para pedidos reales que ya no aplican, marca como <strong>cancelado</strong> en su lugar — eso mantiene el histórico.
            </p>

            <div className="flex gap-2 justify-end pt-3 border-t border-line">
              <Button variant="secondary" onClick={() => setBorrarPedido(null)} disabled={borrandoPedido}>
                Mejor no
              </Button>
              <button
                type="button"
                onClick={confirmarBorrar}
                disabled={borrandoPedido}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                <Icon name="x" size={14} />
                {borrandoPedido ? 'Borrando…' : 'Sí, borrar definitivamente'}
              </button>
            </div>
          </div>
        )}
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
    <div className="space-y-4 min-w-0 max-w-full overflow-hidden">
      <p className="text-sm text-muted">
        Manda este link al cliente por WhatsApp. Cuando lo abra, podrá calificarte 1-5 estrellas y dejar un comentario.
      </p>

      <div className="rounded-xl border border-line bg-line/20 p-3 text-xs font-mono break-all overflow-hidden">
        {link}
      </div>

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

      <details className="rounded-xl border border-line bg-white p-3 text-xs overflow-hidden">
        <summary className="cursor-pointer font-semibold">Vista previa del mensaje</summary>
        <p className="text-muted mt-2 leading-relaxed break-words overflow-wrap-anywhere" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
          {mensaje}
        </p>
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
