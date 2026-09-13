'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { ActionButton, DeleteButton } from '@/components/ui/actions';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn, formatMXN } from '@/lib/utils';
import type { Pedido } from '@/lib/types';

interface Review {
  id: number;
  pedido_id: number | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  rating: number;
  comentario: string | null;
  aprobado: boolean;
  token: string;
  created_at: string;
}

const ENTREGA_LABEL: Record<Pedido['metodo_entrega'], string> = {
  pickup: 'Recoger en sucursal',
  delivery: 'A domicilio',
  sucursal: 'En sucursal',
};
const ENTREGA_ICON: Record<Pedido['metodo_entrega'], IconName> = {
  pickup: 'store',
  delivery: 'truck',
  sucursal: 'store',
};

const FRONTEND = process.env.NEXT_PUBLIC_FRONTEND_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');

export default function ReviewsAdminPage() {
  const [items, setItems] = useState<Review[] | null>(null);
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'aprobados' | 'ocultos'>('todos');
  const [selected, setSelected] = useState<Review | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [historial, setHistorial] = useState<{ pedidos: number; total_gastado?: number; primer_pedido?: string; ultimo_pedido?: string } | null>(null);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Review[] }>('/admin/reviews')
      .then(({ data }) => setItems(data.data))
      .catch(() => setItems([]));
  };
  useEffect(refresh, []);

  const abrirDetalle = async (r: Review) => {
    setSelected(r);
    setPedido(null);
    setHistorial(null);
    // Cargamos el pedido primero para obtener también el correo del cliente y
    // así unificar su ficha por teléfono + email.
    let email = '';
    if (r.pedido_id) {
      setLoadingPedido(true);
      try {
        const { data } = await api.get<{ data: Pedido }>(`/pedidos/${r.pedido_id}`);
        setPedido(data.data);
        email = data.data.cliente_email ?? '';
      } catch {
        toast.error('No se pudo cargar el detalle del pedido');
      } finally {
        setLoadingPedido(false);
      }
    }
    // Ficha agregada del cliente por teléfono Y correo (match por cualquiera).
    const params: Record<string, string> = {};
    if (r.cliente_telefono) params.telefono = r.cliente_telefono;
    if (email) params.email = email;
    if (params.telefono || params.email) {
      api.get<{ data: typeof historial }>('/clientes/historial', { params })
        .then(({ data }) => setHistorial(data.data))
        .catch(() => { /* silencioso: es info complementaria */ });
    }
  };

  const cerrarDetalle = () => {
    setSelected(null);
    setPedido(null);
    setHistorial(null);
  };

  const toggle = async (r: Review) => {
    try {
      await api.patch(`/admin/reviews/${r.id}/toggle`);
      toast.success(r.aprobado ? 'Calificación oculta' : 'Calificación aprobada');
      refresh();
    } catch { toast.error('No se pudo actualizar'); }
  };

  const copyLink = (r: Review) => {
    const link = `${FRONTEND}/review/${r.token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  const borrar = async (r: Review) => {
    try {
      await api.delete(`/admin/reviews/${r.id}`);
      toast.success('Calificación eliminada');
      refresh();
    } catch { toast.error('No se pudo borrar'); }
  };

  const filtered = (items ?? []).filter((r) => {
    if (filtro === 'pendientes') return r.rating === 0;
    if (filtro === 'aprobados')  return r.rating > 0 && r.aprobado;
    if (filtro === 'ocultos')    return r.rating > 0 && !r.aprobado;
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        kicker="Calificaciones"
        kickerIcon="star"
        tourSlug="reviews"
        title="Reseñas de"
        titleAccent="tus clientes."
        description="Modera las calificaciones que aparecen en tu landing pública. Las nuevas se aprueban automáticamente — solo oculta las que no te interesa mostrar."
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: 'todos',      l: 'Todas' },
          { v: 'pendientes', l: 'Sin calificar (link enviado)' },
          { v: 'aprobados',  l: 'Aprobadas' },
          { v: 'ocultos',    l: 'Ocultas' },
        ].map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => setFiltro(v as any)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
              filtro === v ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/30',
            )}
          >{l}</button>
        ))}
      </div>

      {!items ? <Skeleton className="h-40" /> : filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-10">Nada para este filtro.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4 transition hover:border-ink/30 hover:shadow-glass">
              <div className="flex items-start gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => abrirDetalle(r)}
                  className="flex-1 min-w-0 text-left cursor-pointer group"
                  aria-label={`Ver detalle de ${r.cliente_nombre}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold group-hover:underline decoration-dotted underline-offset-4">{r.cliente_nombre}</p>
                    {r.rating > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={cn(n <= r.rating ? 'text-amber-400' : 'text-zinc-200')}><Icon name="star" size={14} /></span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                        Pendiente
                      </span>
                    )}
                    {r.rating > 0 && !r.aprobado && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
                        Oculta
                      </span>
                    )}
                  </div>
                  {r.comentario && <p className="text-sm mt-1.5 italic">"{r.comentario}"</p>}
                  <p className="text-xs text-muted mt-1.5 inline-flex items-center gap-1">
                    {new Date(r.created_at).toLocaleString('es-MX')}
                    <span className="text-ink/40 group-hover:text-ink/70 inline-flex items-center gap-0.5 ml-1">· Ver detalle <Icon name="chevron-right" size={12} /></span>
                  </p>
                </button>
                <div className="inline-flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {r.rating === 0 ? (
                    <ActionButton icon="copy" label="Copiar link" onClick={() => copyLink(r)} />
                  ) : (
                    <Button
                      size="sm"
                      variant={r.aprobado ? 'ghost' : 'secondary'}
                      onClick={() => toggle(r)}
                    >
                      {r.aprobado ? 'Ocultar' : 'Aprobar'}
                    </Button>
                  )}
                  {/* F100 — Borrar definitivo (útil para spam u ofensa). Mantener presionado confirma. */}
                  <DeleteButton compact onDelete={() => borrar(r)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!selected} onClose={cerrarDetalle} title="Detalle de la reseña" size="lg">
        {selected && (
          <div className="space-y-5">
            {/* Reseña */}
            <section className="rounded-2xl border border-line bg-line/20 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted inline-flex items-center gap-1.5">
                  <Icon name="star" size={13} /> Calificación
                </p>
                {selected.rating > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={cn(n <= selected.rating ? 'text-amber-400' : 'text-zinc-200')}><Icon name="star" size={18} /></span>
                    ))}
                    <span className="ml-1.5 text-sm font-bold tabular-nums">{selected.rating}/5</span>
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    Pendiente de calificar
                  </span>
                )}
              </div>
              {selected.comentario ? (
                <p className="text-sm mt-3 italic">"{selected.comentario}"</p>
              ) : (
                <p className="text-sm mt-3 text-muted">Sin comentario.</p>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-3 text-xs text-muted">
                <span>Enviada {new Date(selected.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {selected.rating > 0 && (
                  <span className={cn(
                    'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full',
                    selected.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700',
                  )}>
                    {selected.aprobado ? 'Visible en la landing' : 'Oculta'}
                  </span>
                )}
              </div>
            </section>

            {/* Cliente */}
            <section>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2 inline-flex items-center gap-1.5">
                <Icon name="users" size={13} /> Cliente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoCell icon="users" label="Nombre" value={selected.cliente_nombre} />
                <InfoCell icon="phone" label="Teléfono" value={pedido?.cliente_telefono || selected.cliente_telefono || '—'} />
                {pedido?.cliente_email && <InfoCell icon="paperclip" label="Email" value={pedido.cliente_email} />}
              </div>
              {historial && historial.pedidos > 0 && (
                <div className="mt-3 rounded-xl bg-[color:var(--ce-accent,#F26A1F)]/8 border border-[color:var(--ce-accent,#F26A1F)]/20 px-3.5 py-2.5 text-sm text-ink/80 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="sparkles" size={14} className="text-[color:var(--ce-accent,#F26A1F)]" />
                    Cliente recurrente: <strong className="font-semibold text-ink">{historial.pedidos}</strong> {historial.pedidos === 1 ? 'pedido' : 'pedidos'}
                  </span>
                  {typeof historial.total_gastado === 'number' && (
                    <span>Total gastado: <strong className="font-semibold text-ink">{formatMXN(historial.total_gastado)}</strong></span>
                  )}
                  {historial.primer_pedido && (
                    <span className="text-muted">Cliente desde {new Date(historial.primer_pedido).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</span>
                  )}
                </div>
              )}
            </section>

            {/* Venta / pedido */}
            <section>
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted mb-2 inline-flex items-center gap-1.5">
                <Icon name="cart" size={13} /> Venta asociada
              </p>

              {!selected.pedido_id ? (
                <p className="text-sm text-muted rounded-2xl border border-line bg-white px-4 py-3">
                  Esta reseña no tiene un pedido vinculado.
                </p>
              ) : loadingPedido ? (
                <Skeleton className="h-40" />
              ) : !pedido ? (
                <p className="text-sm text-muted rounded-2xl border border-line bg-white px-4 py-3">
                  No se pudo cargar el pedido.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoCell icon="clipboard" label="Código" value={pedido.codigo} />
                    <InfoCell icon="clock" label="Fecha del pedido" value={new Date(pedido.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} />
                    <InfoCell
                      icon={ENTREGA_ICON[pedido.metodo_entrega]}
                      label="Entrega"
                      value={ENTREGA_LABEL[pedido.metodo_entrega] ?? pedido.metodo_entrega}
                      sub={pedido.direccion ?? undefined}
                    />
                    <InfoCell icon="card" label="Pago" value={pedido.metodo_pago.replace(/_/g, ' ')} />
                  </div>

                  {pedido.notas && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 mb-0.5 inline-flex items-center gap-1.5">
                        <Icon name="lightbulb" size={12} /> Especificaciones del cliente
                      </p>
                      <p className="text-sm text-amber-900">{pedido.notas}</p>
                    </div>
                  )}

                  {pedido.detalles && pedido.detalles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="ce-display font-bold text-sm">Productos</h3>
                        <span className="text-sm font-extrabold tabular-nums">{formatMXN(pedido.total)}</span>
                      </div>
                      <ul className="divide-y divide-line border border-line rounded-xl">
                        {pedido.detalles.map((d) => (
                          <li key={d.id} className="p-3 text-sm">
                            <div className="flex justify-between gap-2">
                              <span>{d.cantidad}× {d.producto_nombre}</span>
                              <span className="tabular-nums">{formatMXN(d.subtotal)}</span>
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
                    </div>
                  )}

                  {/* Desglose de totales */}
                  <dl className="rounded-xl border border-line bg-white px-4 py-3 text-sm space-y-1.5">
                    <Row label="Subtotal" value={formatMXN(pedido.subtotal)} />
                    {pedido.delivery_fee > 0 && <Row label="Envío" value={formatMXN(pedido.delivery_fee)} />}
                    {pedido.descuento > 0 && <Row label="Descuento" value={`- ${formatMXN(pedido.descuento)}`} />}
                    <div className="flex justify-between pt-1.5 border-t border-line font-extrabold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{formatMXN(pedido.total)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoCell({ icon, label, value, sub }: { icon: IconName; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2.5 flex items-start gap-2.5">
      <span className="mt-0.5 text-muted shrink-0"><Icon name={icon} size={16} /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted">{label}</p>
        <p className="text-sm font-semibold capitalize truncate">{value}</p>
        {sub && <p className="text-xs text-muted mt-0.5 break-words">{sub}</p>}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted">
      <dt>{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
