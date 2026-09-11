'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Paginated, Pedido, PedidoEstado, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { formatMXN, cn } from '@/lib/utils';

// Etiqueta e ícono legibles por estado (nada de snake_case crudo en la UI).
const ESTADO_LABEL: Record<PedidoEstado, string> = {
  nuevo: 'Nuevo', confirmado: 'Confirmado', preparando: 'Preparando', listo: 'Listo',
  en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
};
const ESTADO_ICON: Record<PedidoEstado, IconName> = {
  nuevo: 'sparkles', confirmado: 'check', preparando: 'flame', listo: 'package',
  en_camino: 'truck', entregado: 'check-circle', cancelado: 'x',
};
// Color sólido (para el nodo activo/completado del timeline y el CTA).
const ESTADO_SOLID: Record<PedidoEstado, string> = {
  nuevo: '#2563eb', confirmado: '#4f46e5', preparando: '#d97706', listo: '#0d9488',
  en_camino: '#7c3aed', entregado: '#059669', cancelado: '#dc2626',
};

// Modo de entrega — cambia el flujo, el texto del botón y las etiquetas del timeline.
type Modo = 'delivery' | 'pickup' | 'sucursal';
const MODO_META: Record<Modo, { label: string; icon: IconName }> = {
  delivery: { label: 'A domicilio', icon: 'truck' },
  pickup: { label: 'Recoger en sucursal', icon: 'store' },
  sucursal: { label: 'Para comer aquí', icon: 'utensils' },
};

/** Flujo de estados según el modo: sólo a domicilio pasa por "en camino". */
function flowDe(modo: Modo): PedidoEstado[] {
  return modo === 'delivery'
    ? ['nuevo', 'confirmado', 'preparando', 'listo', 'en_camino', 'entregado']
    : ['nuevo', 'confirmado', 'preparando', 'listo', 'entregado'];
}

/** Etiqueta del estado adaptada al modo: "Listo para recoger/entregar". */
function estadoLabelModo(estado: PedidoEstado, modo: Modo): string {
  if (estado === 'listo') {
    return modo === 'delivery' ? 'Listo'
      : modo === 'pickup' ? 'Listo para recoger'
        : 'Listo para entregar';
  }
  return ESTADO_LABEL[estado];
}

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
              data-tour="pedidos-filtro-estado"
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
          {items.map((p, i) => {
            const iniciales = (p.cliente_nombre || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
            const colorAvatar = ESTADO_AVATAR[p.estado] ?? 'bg-zinc-100 text-zinc-700';
            return (
              <article
                key={p.id}
                data-tour={i === 0 ? 'pedido-card' : undefined}
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
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1', ESTADO_COLOR[p.estado])}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_SOLID[p.estado] }} />
                        {ESTADO_LABEL[p.estado]}
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
                        data-tour={i === 0 ? 'pedido-estado' : undefined}
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
                        data-tour="pedido-calificacion"
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
                        <Icon name="refresh-cw" size={13} className="inline-block mr-1 align-[-2px]" />Restaurar
                      </button>
                    )}
                    <button
                      data-tour={i === 0 ? 'pedido-borrar' : undefined}
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
  const mensaje = `Hola ${pedido.cliente_nombre} ¡Gracias por tu pedido en nuestro local! Nos encantaría saber qué te pareció. Califícanos en 30 segundos aquí: ${link}`;
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

function fmtHora(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Timeline visual del avance del pedido (interactivo/llamativo, sólo lectura). */
function EstadoTimeline({ pedido }: { pedido: Pedido }) {
  const modo = pedido.metodo_entrega as Modo;
  const FLOW = flowDe(modo);
  const cancelado = pedido.estado === 'cancelado';
  const curIdx = cancelado ? -1 : FLOW.indexOf(pedido.estado);
  // % de avance para la barra de progreso (0 en nuevo → 100 en el último).
  const pct = cancelado ? 0 : Math.max(0, Math.min(100, (curIdx / (FLOW.length - 1)) * 100));

  const tiempo = (e: PedidoEstado): string | null =>
    e === 'nuevo' ? fmtHora(pedido.created_at)
      : e === 'confirmado' ? fmtHora(pedido.confirmado_at)
        : e === 'entregado' ? fmtHora(pedido.entregado_at)
          : null;

  return (
    <div className={cn('rounded-2xl border p-4 pt-3', cancelado ? 'border-red-200 bg-red-50/40' : 'border-line bg-gradient-to-b from-[#FBF7F1] to-white')}>
      {/* Chip del modo de entrega */}
      <div className="flex justify-center mb-3">
        <span className={cn(
          'inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border',
          cancelado ? 'bg-white border-red-200 text-red-500' : 'bg-white border-line text-ink/70',
        )}>
          <Icon name={MODO_META[modo].icon} size={12} /> {MODO_META[modo].label}
        </span>
      </div>

      <div className="relative">
        {/* Riel base + barra de avance continua detrás de los nodos */}
        <span className="absolute top-5 left-[10%] right-[10%] h-[3px] rounded-full bg-line/70" />
        {!cancelado && (
          <span
            className="absolute top-5 left-[10%] h-[3px] rounded-full transition-all duration-500"
            style={{ width: `calc(${pct}% * 0.8)`, background: `linear-gradient(90deg, ${ESTADO_SOLID.nuevo}, ${ESTADO_SOLID[FLOW[Math.max(0, curIdx)]] ?? ESTADO_SOLID.nuevo})` }}
          />
        )}

        <div className="relative flex items-start">
          {FLOW.map((e, i) => {
            const done = i < curIdx;
            const current = i === curIdx;
            const active = done || current;
            const color = ESTADO_SOLID[e];
            const t = tiempo(e);
            return (
              <div key={e} className="flex-1 flex flex-col items-center relative min-w-0">
                <span
                  className={cn('relative z-10 w-10 h-10 rounded-full grid place-items-center transition-all duration-300')}
                  style={
                    active
                      ? { background: color, color: '#fff', boxShadow: current ? `0 0 0 5px ${color}26` : `0 4px 10px -4px ${color}` }
                      : { background: '#fff', border: '2px solid var(--ce-line,#e7e5e4)', color: 'var(--ce-muted,#a8a29e)' }
                  }
                >
                  {current && !cancelado && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.35 }} />
                  )}
                  <Icon name={done ? 'check' : ESTADO_ICON[e]} size={16} className="relative" />
                </span>
                <span className={cn('mt-1.5 text-[11px] font-semibold text-center leading-tight px-0.5 break-words', active ? 'text-ink' : 'text-muted')}>
                  {estadoLabelModo(e, modo)}
                </span>
                {t && <span className="text-[10px] text-muted tabular-nums">{t}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {cancelado && (
        <p className="mt-3 text-center text-xs font-semibold text-red-600 flex items-center gap-1.5 justify-center">
          <Icon name="x" size={12} /> Este pedido fue cancelado
        </p>
      )}
    </div>
  );
}

function InfoCell({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3 flex items-start gap-2.5">
      <span className="w-8 h-8 rounded-full bg-line/40 grid place-items-center shrink-0 text-ink/70">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
        <p className="font-semibold text-sm break-words">{value}</p>
        {sub && <p className="text-xs text-muted break-words">{sub}</p>}
      </div>
    </div>
  );
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

  const modo = pedido.metodo_entrega as Modo;
  const transiciones = TRANSICIONES[pedido.estado] ?? [];
  const retrocesos   = TRANSICIONES_ATRAS[pedido.estado] ?? [];
  // El "siguiente" natural sale del flujo del MODO (así "en camino" sólo
  // aparece a domicilio; pickup/mesa saltan directo a entregado desde listo).
  const flow = flowDe(modo);
  const idxFlow = flow.indexOf(pedido.estado);
  const siguienteFlujo = idxFlow >= 0 && idxFlow < flow.length - 1 ? flow[idxFlow + 1] : undefined;
  const siguiente = siguienteFlujo && transiciones.includes(siguienteFlujo)
    ? siguienteFlujo
    : transiciones.find((t) => t !== 'cancelado');
  const puedeCancelar = transiciones.includes('cancelado');

  return (
    <div>
      {/* Progreso visual del pedido */}
      <EstadoTimeline pedido={pedido} />

      {/* Acción principal + secundarias */}
      <div className="mt-5 mb-5">
        {pedido.estado === 'cancelado' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-red-100 grid place-items-center shrink-0"><Icon name="x" size={16} className="text-red-600" /></span>
            <div className="text-sm"><p className="font-bold text-red-900">Pedido cancelado</p><p className="text-red-700 text-xs">Este pedido ya no está activo.</p></div>
          </div>
        ) : siguiente ? (
          <button
            onClick={() => onChange(pedido, siguiente)}
            className="w-full h-14 rounded-2xl text-white font-extrabold text-base inline-flex items-center justify-center gap-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
            style={{ background: ESTADO_SOLID[siguiente], boxShadow: `0 12px 26px -12px ${ESTADO_SOLID[siguiente]}` }}
          >
            <Icon name={ESTADO_ICON[siguiente]} size={18} /> Marcar como {estadoLabelModo(siguiente, modo).toLowerCase()}
          </button>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-emerald-100 grid place-items-center shrink-0"><Icon name="check-circle" size={18} className="text-emerald-600" /></span>
            <div className="text-sm"><p className="font-bold text-emerald-900">¡Pedido entregado!</p><p className="text-emerald-700 text-xs">Pídele su calificación al cliente desde la lista.</p></div>
          </div>
        )}

        {(puedeCancelar || retrocesos.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {puedeCancelar && (
              <button
                onClick={() => { if (confirm('¿Cancelar este pedido?')) onChange(pedido, 'cancelado'); }}
                className="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <Icon name="x" size={12} /> Cancelar pedido
              </button>
            )}
            {retrocesos.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <span className="text-[10px] text-muted uppercase tracking-wider">¿Te equivocaste?</span>
                {retrocesos.map((t) => (
                  <button
                    key={t}
                    onClick={() => { if (confirm(`¿Regresar a "${ESTADO_LABEL[t]}"?`)) onChange(pedido, t); }}
                    className="px-2.5 py-1 rounded-full border border-line text-xs hover:bg-line/40 inline-flex items-center gap-1"
                  >
                    <Icon name="arrow-left" size={11} /> {ESTADO_LABEL[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <InfoCell icon="users" label="Cliente" value={pedido.cliente_nombre} sub={pedido.cliente_telefono} />
        <InfoCell
          icon={MODO_META[modo].icon}
          label="Entrega"
          value={MODO_META[modo].label}
          sub={pedido.direccion ?? undefined}
        />
        <InfoCell icon="card" label="Pago" value={pedido.metodo_pago.replace(/_/g, ' ')} />
        <InfoCell icon="clock" label="Recibido" value={new Date(pedido.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} />
      </div>

      {pedido.notas && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-0.5 inline-flex items-center gap-1.5">
            <Icon name="lightbulb" size={12} /> Especificaciones del cliente
          </p>
          <p className="text-sm text-amber-900">{pedido.notas}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="ce-display font-bold">Items</h3>
        <span className="text-sm font-extrabold tabular-nums">{formatMXN(pedido.total)}</span>
      </div>
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
