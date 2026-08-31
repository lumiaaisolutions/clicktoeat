'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { QRCode, downloadQR } from '@/components/ui/QRCode';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Piso {
  id: number;
  nombre: string;
  orden: number;
  mesas_count?: number;
}

interface Mesa {
  id: number;
  piso_id: number | null;
  etiqueta: string;
  estado: EstadoMesa;
  qr_token: string;
  pos_x: number;
  pos_y: number;
  atendido_por?: number | null;
  atiende?: string | null;
}

type EstadoMesa = 'libre' | 'ocupada' | 'por_cobrar' | 'reservada' | 'limpieza';

interface MesaEvento {
  id: number;
  tipo: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}
interface CuentaPedido { id: number; codigo: string; total: number; }
interface MesaDetalle {
  id: number;
  etiqueta: string;
  estado: Mesa['estado'];
  atiende: string | null;
  atendido_por: number | null;
  cuenta: { id: number; estado: string; total: number; pedidos?: CuentaPedido[] } | null;
  eventos: MesaEvento[];
}

const EVENTO_LABEL: Record<string, string> = {
  tomada: 'Mesero tomó la mesa',
  liberada: 'Mesa liberada',
  estado_cambio: 'Cambio de estado',
  pedido_agregado: 'Pedido agregado',
  cuenta_cerrada: 'Cuenta cobrada',
};

const ESTADO_LABEL: Record<EstadoMesa, string> = {
  libre: 'Libre', ocupada: 'Ocupada', por_cobrar: 'Por cobrar', reservada: 'Reservada', limpieza: 'Limpieza',
};
const ESTADO_COLOR: Record<EstadoMesa, string> = {
  libre: 'bg-emerald-100 text-emerald-700',
  ocupada: 'bg-amber-100 text-amber-700',
  por_cobrar: 'bg-red-100 text-red-700',
  reservada: 'bg-indigo-100 text-indigo-700',
  limpieza: 'bg-slate-100 text-slate-700',
};

export default function MesasPage() {
  const [pisos, setPisos] = useState<Piso[] | null>(null);
  const [mesas, setMesas] = useState<Mesa[] | null>(null);
  const [creatingPiso, setCreatingPiso] = useState(false);
  const [creatingMesaPisoId, setCreatingMesaPisoId] = useState<number | null | 'none'>(null);
  const [editingMesa, setEditingMesa] = useState<Mesa | null>(null);
  const [qrMesa, setQrMesa] = useState<Mesa | null>(null);
  const [detalle, setDetalle] = useState<MesaDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const cargarDetalle = async (id: number) => {
    try {
      const res = await api.get<{ data: MesaDetalle }>(`/mesas/${id}`);
      setDetalle(res.data.data);
    } catch {
      toast.error('No se pudo cargar el detalle');
    }
  };

  const abrirDetalle = async (m: Mesa) => {
    setDetalleLoading(true);
    setDetalle({ id: m.id, etiqueta: m.etiqueta, estado: m.estado, atiende: m.atiende ?? null, atendido_por: m.atendido_por ?? null, cuenta: null, eventos: [] });
    await cargarDetalle(m.id);
    setDetalleLoading(false);
  };

  const tomarMesa = async (id: number) => {
    try {
      await api.post(`/mesas/${id}/tomar`);
      await Promise.all([refresh(), cargarDetalle(id)]);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo tomar la mesa');
    }
  };

  const liberarMesa = async (id: number) => {
    try {
      await api.post(`/mesas/${id}/liberar`);
      await Promise.all([refresh(), cargarDetalle(id)]);
    } catch {
      toast.error('No se pudo liberar la mesa');
    }
  };

  const cambiarEstado = async (id: number, estado: EstadoMesa) => {
    try {
      await api.patch(`/mesas/${id}`, { estado });
      await Promise.all([refresh(), cargarDetalle(id)]);
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const transferirCuenta = async (cuentaId: number, destinoId: number, mesaId: number) => {
    try {
      await api.post(`/cuentas-mesa/${cuentaId}/transferir`, { mesa_destino_id: destinoId });
      toast.success('Cuenta transferida');
      await Promise.all([refresh(), cargarDetalle(mesaId)]);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo transferir');
    }
  };

  const refresh = async () => {
    const [pisosRes, mesasRes] = await Promise.all([
      api.get<{ data: Piso[] }>('/pisos'),
      api.get<{ data: Mesa[] }>('/mesas'),
    ]);
    setPisos(pisosRes.data.data);
    setMesas(mesasRes.data.data);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const removeMesa = async (m: Mesa) => {
    if (!confirm(`¿Eliminar "${m.etiqueta}"?`)) return;
    try {
      await api.delete(`/mesas/${m.id}`);
      toast.success('Mesa eliminada');
      refresh();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const removePiso = async (p: Piso) => {
    if (!confirm(`¿Eliminar el piso "${p.nombre}"? Las mesas quedarán sin piso asignado.`)) return;
    try {
      await api.delete(`/pisos/${p.id}`);
      toast.success('Piso eliminado');
      refresh();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  if (pisos === null || mesas === null) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const gruposPiso: Array<{ piso: Piso | null; mesas: Mesa[] }> = [
    ...pisos.map((piso) => ({ piso, mesas: mesas.filter((m) => m.piso_id === piso.id) })),
    { piso: null, mesas: mesas.filter((m) => m.piso_id === null) },
  ].filter((g) => g.piso !== null || g.mesas.length > 0);

  return (
    <div>
      <AdminPageHeader
        kicker="Salón" kickerIcon="map-pin"
        title="Mesas" titleAccent="y pisos de tu local."
        description="Cada mesa genera su propio QR — el cliente lo escanea, ve el menú y pide sin esperar a que lo atiendan."
        actions={<Button onClick={() => setCreatingPiso(true)}>+ Nuevo piso</Button>}
      />

      {gruposPiso.length === 0 && (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="map-pin" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Aún no tienes pisos ni mesas</p>
          <p className="text-sm text-muted mt-1">Crea un piso para empezar a agregar mesas.</p>
        </div>
      )}

      <div className="space-y-6">
        {gruposPiso.map(({ piso, mesas: mesasDelPiso }) => (
          <div key={piso?.id ?? 'sin-piso'} className="rounded-2xl border border-line bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-line">
              <h3 className="ce-display font-bold">{piso?.nombre ?? 'Sin piso asignado'}</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setCreatingMesaPisoId(piso?.id ?? 'none')}>
                  + Mesa
                </Button>
                {piso && (
                  <Button size="sm" variant="ghost" onClick={() => removePiso(piso)}>Borrar piso</Button>
                )}
              </div>
            </div>
            {piso && mesasDelPiso.length > 0 && (
              <div className="px-4 pt-4">
                <FloorCanvas mesas={mesasDelPiso} onMoved={refresh} />
              </div>
            )}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {mesasDelPiso.length === 0 && (
                <p className="text-sm text-muted col-span-full">Sin mesas todavía.</p>
              )}
              {mesasDelPiso.map((m) => (
                <div key={m.id} className="rounded-xl border border-line p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{m.etiqueta}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', ESTADO_COLOR[m.estado])}>
                      {ESTADO_LABEL[m.estado]}
                    </span>
                  </div>
                  {m.atiende && (
                    <p className="text-[11px] text-muted">Atiende: <span className="font-medium text-ink">{m.atiende}</span></p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => abrirDetalle(m)}>Ver</Button>
                    <Button size="sm" variant="ghost" onClick={() => setQrMesa(m)}>QR</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMesa(m)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeMesa(m)}>Borrar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <PisoModal open={creatingPiso} onClose={() => setCreatingPiso(false)} onSaved={() => { setCreatingPiso(false); refresh(); }} />
      <MesaModal
        open={creatingMesaPisoId !== null || !!editingMesa}
        pisoId={editingMesa ? editingMesa.piso_id : (creatingMesaPisoId === 'none' ? null : creatingMesaPisoId)}
        mesa={editingMesa ?? undefined}
        pisos={pisos}
        onClose={() => { setCreatingMesaPisoId(null); setEditingMesa(null); }}
        onSaved={() => { setCreatingMesaPisoId(null); setEditingMesa(null); refresh(); }}
      />
      {qrMesa && (
        <Modal open onClose={() => setQrMesa(null)} title={`QR — ${qrMesa.etiqueta}`} size="sm">
          <MesaQrContent mesa={qrMesa} />
        </Modal>
      )}

      {detalle && (
        <Modal open onClose={() => setDetalle(null)} title={`Mesa ${detalle.etiqueta}`} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ESTADO_COLOR[detalle.estado])}>
                {ESTADO_LABEL[detalle.estado]}
              </span>
              {detalle.atiende
                ? <span className="text-sm text-muted">Atiende: <span className="font-medium text-ink">{detalle.atiende}</span></span>
                : <span className="text-sm text-muted">Sin mesero asignado</span>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {detalle.atendido_por
                ? <Button size="sm" variant="ghost" onClick={() => liberarMesa(detalle.id)}>Liberar mesa</Button>
                : <Button size="sm" onClick={() => tomarMesa(detalle.id)}>Tomar control</Button>}
            </div>

            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-xs text-muted mr-1">Estado:</span>
              {(['libre', 'reservada', 'limpieza'] as const).map((e) => (
                <Button key={e} size="sm" variant={detalle.estado === e ? 'primary' : 'ghost'} onClick={() => cambiarEstado(detalle.id, e)}>
                  {ESTADO_LABEL[e]}
                </Button>
              ))}
            </div>

            {detalle.cuenta && (
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-xs text-muted">Transferir a:</span>
                <select
                  className="border border-line rounded-lg px-2 py-1 text-sm"
                  defaultValue=""
                  onChange={(ev) => { const v = Number(ev.target.value); if (v) transferirCuenta(detalle.cuenta!.id, v, detalle.id); }}
                >
                  <option value="" disabled>Elegir mesa libre…</option>
                  {(mesas ?? []).filter((m) => m.estado === 'libre' && m.id !== detalle.id).map((m) => (
                    <option key={m.id} value={m.id}>{m.etiqueta}</option>
                  ))}
                </select>
              </div>
            )}

            {detalle.cuenta && (
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">Cuenta actual</span>
                  <span className="ce-display font-bold">${Number(detalle.cuenta.total).toFixed(2)}</span>
                </div>
                <ul className="text-xs text-muted space-y-0.5">
                  {(detalle.cuenta.pedidos ?? []).map((p) => (
                    <li key={p.id} className="flex justify-between"><span>{p.codigo}</span><span>${Number(p.total).toFixed(2)}</span></li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Historial</p>
              {detalleLoading ? (
                <Skeleton className="h-24" />
              ) : detalle.eventos.length === 0 ? (
                <p className="text-xs text-muted">Sin movimientos todavía.</p>
              ) : (
                <ol className="space-y-2 max-h-64 overflow-y-auto">
                  {detalle.eventos.map((e) => (
                    <li key={e.id} className="flex gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-ink">{EVENTO_LABEL[e.tipo] ?? e.tipo}</span>
                        {e.estado_anterior && e.estado_nuevo && (
                          <span className="text-muted"> · {e.estado_anterior} → {e.estado_nuevo}</span>
                        )}
                        <div className="text-muted">
                          {e.usuario && <span>{e.usuario} · </span>}
                          {new Date(e.created_at).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 360;
const CHIP_SIZE = 64;

/**
 * Mapa de piso con drag real (pointer events nativos — sin librería nueva).
 * Arrastra un chip de mesa; al soltar, persiste pos_x/pos_y en el backend.
 * Posiciones se guardan en px dentro de un lienzo de tamaño fijo (v1 — no
 * escala con el tamaño de pantalla, ver plan de implementación).
 */
function FloorCanvas({ mesas, onMoved }: { mesas: Mesa[]; onMoved: () => void }) {
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>(
    () => Object.fromEntries(mesas.map((m) => [m.id, { x: m.pos_x, y: m.pos_y }])),
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ id: number | null }>({ id: null });

  useEffect(() => {
    setPositions(Object.fromEntries(mesas.map((m) => [m.id, { x: m.pos_x, y: m.pos_y }])));
  }, [mesas]);

  // Listeners a nivel window (no pointer capture) — más robusto que
  // onPointerMove/onPointerUp en el propio elemento, que puede perder
  // eventos si el puntero sale del chip o del contenedor durante el drag.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const id = dragState.current.id;
      const rect = containerRef.current?.getBoundingClientRect();
      if (id === null || !rect) return;
      const x = Math.max(0, Math.min(CANVAS_WIDTH - CHIP_SIZE, e.clientX - rect.left - CHIP_SIZE / 2));
      const y = Math.max(0, Math.min(CANVAS_HEIGHT - CHIP_SIZE, e.clientY - rect.top - CHIP_SIZE / 2));
      setPositions((prev) => ({ ...prev, [id]: { x, y } }));
    };
    const onUp = async () => {
      const id = dragState.current.id;
      if (id === null) return;
      dragState.current.id = null;
      const pos = positions[id];
      try {
        await api.patch(`/mesas/${id}`, { pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) });
        onMoved();
      } catch {
        toast.error('No se pudo guardar la posición');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions]);

  return (
    <div
      ref={(el) => { containerRef.current = el; }}
      className="relative rounded-2xl border border-dashed border-line bg-line/10 overflow-hidden select-none"
      style={{ width: '100%', maxWidth: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
    >
      {mesas.map((m) => {
        const pos = positions[m.id] ?? { x: 0, y: 0 };
        return (
          <div
            key={m.id}
            onMouseDown={() => { dragState.current.id = m.id; }}
            className={cn(
              'absolute grid place-items-center rounded-xl border-2 bg-white text-xs font-semibold cursor-grab active:cursor-grabbing shadow-soft',
              m.estado === 'libre' && 'border-emerald-400',
              m.estado === 'ocupada' && 'border-amber-400',
              m.estado === 'por_cobrar' && 'border-red-400',
            )}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: pos.x, top: pos.y }}
          >
            {m.etiqueta}
          </div>
        );
      })}
    </div>
  );
}

function MesaQrContent({ mesa }: { mesa: Mesa }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const url = `${baseUrl}/mesa/${mesa.qr_token}`;
  return (
    <div className="flex flex-col items-center gap-4">
      <QRCode value={url} size={220} framed />
      <p className="text-xs text-muted break-all text-center">{url}</p>
      <Button onClick={() => downloadQR(url, `mesa-${mesa.etiqueta}`)}>Descargar para imprimir</Button>
    </div>
  );
}

function PisoModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => { if (open) { setNombre(''); setError(undefined); } }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/pisos', { nombre });
      toast.success('Piso creado');
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.errors?.nombre?.[0] ?? 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo piso" size="sm">
      <form onSubmit={onSubmit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={error} placeholder="Planta baja" />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function MesaModal({
  open, onClose, onSaved, mesa, pisoId, pisos,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  mesa?: Mesa; pisoId: number | null; pisos: Piso[];
}) {
  const [etiqueta, setEtiqueta] = useState('');
  const [selectedPisoId, setSelectedPisoId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEtiqueta(mesa?.etiqueta ?? '');
    setSelectedPisoId(mesa ? mesa.piso_id : pisoId);
    setErrors({});
  }, [open, mesa, pisoId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { etiqueta, piso_id: selectedPisoId };
      if (mesa) await api.patch(`/mesas/${mesa.id}`, payload);
      else await api.post('/mesas', payload);
      toast.success(mesa ? 'Mesa actualizada' : 'Mesa creada');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={mesa ? `Editar ${mesa.etiqueta}` : 'Nueva mesa'} size="sm">
      <form onSubmit={onSubmit}>
        <Field label="Etiqueta" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} required error={errors.etiqueta} placeholder="Mesa 5" />
        <label className="block mb-3">
          <span className="block text-sm font-medium mb-1">Piso</span>
          <select
            className="w-full px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0 border border-line rounded-xl bg-white text-base md:text-sm"
            value={selectedPisoId ?? ''}
            onChange={(e) => setSelectedPisoId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Sin piso</option>
            {pisos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
