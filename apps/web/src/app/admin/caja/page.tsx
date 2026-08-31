'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Caja {
  id: number;
  nombre: string;
}

interface Movimiento {
  id: number;
  tipo: 'fondo' | 'retiro' | 'vale';
  monto: string;
  motivo: string | null;
}

interface CorteAbierto {
  id: number;
  monto_inicial: string;
  abierta_at: string;
  movimientos: Movimiento[];
}

interface CuentaMesa {
  id: number;
  mesa: { etiqueta: string } | null;
  estado: 'abierta' | 'pre_cuenta' | 'cerrada';
  subtotal: string;
  total: string;
  gift_card_id?: number | null;
  descuento_gift_card?: string;
}

const METODOS = ['efectivo', 'tarjeta_entrega', 'tarjeta_tpv', 'transferencia'] as const;

const ESTADO_CUENTA_COLOR: Record<CuentaMesa['estado'], string> = {
  abierta: 'bg-blue-100 text-blue-700',
  pre_cuenta: 'bg-amber-100 text-amber-700',
  cerrada: 'bg-emerald-100 text-emerald-700',
};

interface PedidoMostrador {
  id: number;
  codigo: string;
  cliente_nombre: string | null;
  total: string;
}
const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta_tpv: 'Tarjeta', transferencia: 'Transferencia',
};

export default function CajaPage() {
  const [cajas, setCajas] = useState<Caja[] | null>(null);
  const [selectedCajaId, setSelectedCajaId] = useState<number | null>(null);
  const [corte, setCorte] = useState<CorteAbierto | null | undefined>(undefined);
  const [cuentas, setCuentas] = useState<CuentaMesa[] | null>(null);
  const [creatingCaja, setCreatingCaja] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [movTipo, setMovTipo] = useState<'fondo' | 'retiro' | 'vale'>('retiro');
  const [movMonto, setMovMonto] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [cerrandoCorte, setCerrandoCorte] = useState(false);
  const [cobrando, setCobrando] = useState<CuentaMesa | null>(null);
  const [pendientes, setPendientes] = useState<PedidoMostrador[] | null>(null);

  const refreshPendientes = async () => {
    const { data } = await api.get<{ data: PedidoMostrador[] }>('/caja/pendientes');
    setPendientes(data.data);
  };

  const cobrarMostrador = async (pedidoId: number, metodo: string) => {
    try {
      await api.post(`/pedidos/${pedidoId}/cobrar`, { metodo_pago: metodo, corte_caja_id: corte?.id ?? null });
      toast.success('Pedido cobrado');
      refreshPendientes();
      if (selectedCajaId) refreshCorte(selectedCajaId);
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'No se pudo cobrar');
    }
  };

  const refreshCajas = async () => {
    const { data } = await api.get<{ data: Caja[] }>('/cajas');
    setCajas(data.data);
    if (data.data.length > 0 && selectedCajaId === null) setSelectedCajaId(data.data[0].id);
  };

  const refreshCorte = async (cajaId: number) => {
    setCorte(undefined);
    const { data } = await api.get<{ data: { corte_abierto: CorteAbierto | null } }>(`/cajas/${cajaId}`);
    setCorte(data.data.corte_abierto);
  };

  const refreshCuentas = async () => {
    const { data } = await api.get<{ data: CuentaMesa[] }>('/cuentas-mesa');
    setCuentas(data.data);
  };

  useEffect(() => {
    refreshCajas();
    refreshCuentas();
    refreshPendientes();
    const id = setInterval(() => { refreshCuentas(); refreshPendientes(); }, 15_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (selectedCajaId !== null) refreshCorte(selectedCajaId); }, [selectedCajaId]);

  const abrirCorte = async (montoInicial: number) => {
    if (!selectedCajaId) return;
    try {
      await api.post(`/cajas/${selectedCajaId}/abrir-corte`, { monto_inicial: montoInicial });
      toast.success('Corte abierto');
      setAbriendo(false);
      refreshCorte(selectedCajaId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo abrir el corte');
    }
  };

  const agregarMovimiento = async () => {
    if (!corte || !movMonto) return;
    try {
      await api.post(`/cortes-caja/${corte.id}/movimientos`, { tipo: movTipo, monto: Number(movMonto), motivo: movMotivo || undefined });
      toast.success('Movimiento registrado');
      setMovMonto(''); setMovMotivo('');
      if (selectedCajaId) refreshCorte(selectedCajaId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo registrar');
    }
  };

  const cerrarCorte = async (montoContado: number) => {
    if (!corte) return;
    try {
      const { data } = await api.post(`/cortes-caja/${corte.id}/cerrar`, { monto_contado: montoContado });
      toast.success(`Corte cerrado. Varianza: $${data.data.varianza}`);
      setCerrandoCorte(false);
      if (selectedCajaId) refreshCorte(selectedCajaId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo cerrar');
    }
  };

  if (cajas === null) {
    return (
      <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        kicker="Salón" kickerIcon="storefront"
        title="Caja" titleAccent="cortes y cuentas de mesa."
        actions={<Button onClick={() => setCreatingCaja(true)}>+ Nueva caja</Button>}
      />

      {cajas.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <p className="ce-display text-xl font-bold">Aún no tienes cajas registradas</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            {cajas.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCajaId(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${selectedCajaId === c.id ? 'bg-ink text-white border-ink' : 'border-line bg-white'}`}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 mb-6">
            {corte === undefined ? (
              <Skeleton className="h-24" />
            ) : corte === null ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Esta caja no tiene un corte abierto.</p>
                <Button onClick={() => setAbriendo(true)}>Abrir corte</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted">Monto inicial</p>
                    <p className="ce-display font-bold text-lg">${corte.monto_inicial}</p>
                  </div>
                  <Button variant="secondary" onClick={() => setCerrandoCorte(true)}>Cerrar corte</Button>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Movimientos</p>
                  <ul className="text-sm divide-y divide-line mb-3">
                    {corte.movimientos.length === 0 && <li className="text-muted py-1">Sin movimientos.</li>}
                    {corte.movimientos.map((m) => (
                      <li key={m.id} className="py-1.5 flex justify-between">
                        <span className="capitalize">{m.tipo}{m.motivo ? ` — ${m.motivo}` : ''}</span>
                        <span className="font-medium">${m.monto}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 flex-wrap items-end">
                    <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as any)} className="border border-line rounded-xl px-3 py-2 text-sm">
                      <option value="fondo">Fondo</option>
                      <option value="retiro">Retiro</option>
                      <option value="vale">Vale</option>
                    </select>
                    <input placeholder="Monto" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} className="border border-line rounded-xl px-3 py-2 text-sm w-24" />
                    <input placeholder="Motivo (opcional)" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} className="border border-line rounded-xl px-3 py-2 text-sm flex-1 min-w-[140px]" />
                    <Button size="sm" onClick={agregarMovimiento}>Agregar</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <h3 className="ce-display font-bold mb-2">Mostrador — por cobrar</h3>
      {pendientes === null ? (
        <Skeleton className="h-20" />
      ) : pendientes.length === 0 ? (
        <p className="text-sm text-muted mb-6">Sin pedidos de mostrador pendientes.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {pendientes.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="ce-display font-bold">{p.cliente_nombre || p.codigo}</span>
                <span className="ce-display font-bold text-xl">${p.total}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['efectivo', 'tarjeta_tpv', 'transferencia'] as const).map((m) => (
                  <Button key={m} size="sm" variant={m === 'efectivo' ? 'primary' : 'secondary'} onClick={() => cobrarMostrador(p.id, m)}>
                    {METODO_LABEL[m]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="ce-display font-bold mb-2">Cuentas de mesa abiertas</h3>
      {cuentas === null ? (
        <Skeleton className="h-24" />
      ) : cuentas.length === 0 ? (
        <p className="text-sm text-muted">No hay cuentas abiertas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cuentas.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-white p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="ce-display font-bold">{c.mesa?.etiqueta ?? `Cuenta #${c.id}`}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${ESTADO_CUENTA_COLOR[c.estado]}`}>{c.estado.replace('_', ' ')}</span>
              </div>
              <p className="ce-display font-bold text-xl">${c.total}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setCobrando(c)}>Cobrar</Button>
                <a href={`/admin/caja/ticket/${c.id}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="secondary">Ticket</Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <CrearCajaModal open={creatingCaja} onClose={() => setCreatingCaja(false)} onSaved={() => { setCreatingCaja(false); refreshCajas(); }} />
      <AbrirCorteModal open={abriendo} onClose={() => setAbriendo(false)} onConfirm={abrirCorte} />
      <CerrarCorteModal open={cerrandoCorte} onClose={() => setCerrandoCorte(false)} onConfirm={cerrarCorte} />
      {cobrando && (
        <CobrarCuentaModal
          cuenta={cobrando}
          corteId={corte && corte !== undefined ? corte.id : null}
          onClose={() => setCobrando(null)}
          onCharged={() => { setCobrando(null); refreshCuentas(); if (selectedCajaId) refreshCorte(selectedCajaId); }}
        />
      )}
    </div>
  );
}

function CrearCajaModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setNombre(''); }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/cajas', { nombre });
      onSaved();
    } catch {
      toast.error('No se pudo crear la caja');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva caja" size="sm">
      <form onSubmit={submit}>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Caja 1" />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function AbrirCorteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (monto: number) => void }) {
  const [monto, setMonto] = useState('0');
  useEffect(() => { if (open) setMonto('0'); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Abrir corte" size="sm">
      <Field label="Monto inicial en caja" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <div className="flex justify-end gap-2 pt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onConfirm(Number(monto))}>Abrir</Button>
      </div>
    </Modal>
  );
}

function CerrarCorteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (monto: number) => void }) {
  const [monto, setMonto] = useState('0');
  useEffect(() => { if (open) setMonto('0'); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Cerrar corte" size="sm">
      <Field label="Monto contado en caja" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <div className="flex justify-end gap-2 pt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onConfirm(Number(monto))}>Cerrar corte</Button>
      </div>
    </Modal>
  );
}

function CobrarCuentaModal({
  cuenta: cuentaInicial, corteId, onClose, onCharged,
}: {
  cuenta: CuentaMesa; corteId: number | null; onClose: () => void; onCharged: () => void;
}) {
  const [cuenta, setCuenta] = useState(cuentaInicial);
  const [giftCardCodigo, setGiftCardCodigo] = useState('');
  const [aplicandoGiftCard, setAplicandoGiftCard] = useState(false);
  const [pagos, setPagos] = useState<Array<{ monto: string; metodo_pago: typeof METODOS[number] }>>([
    { monto: cuentaInicial.total, metodo_pago: 'efectivo' },
  ]);
  const [propina, setPropina] = useState('0');
  const [saving, setSaving] = useState(false);

  const sumaPagos = pagos.reduce((s, p) => s + Number(p.monto || 0), 0);

  const aplicarGiftCard = async () => {
    if (!giftCardCodigo) return;
    setAplicandoGiftCard(true);
    try {
      const { data } = await api.post(`/cuentas-mesa/${cuenta.id}/gift-card`, { codigo: giftCardCodigo });
      setCuenta(data.data);
      setPagos([{ monto: data.data.total, metodo_pago: 'efectivo' }]);
      toast.success('Gift card aplicada');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo aplicar la gift card');
    } finally { setAplicandoGiftCard(false); }
  };

  const cobrar = async () => {
    setSaving(true);
    try {
      await api.post(`/cuentas-mesa/${cuenta.id}/cerrar`, {
        pagos: pagos.map((p) => ({ monto: Number(p.monto), metodo_pago: p.metodo_pago })),
        propina: Number(propina) || 0,
        corte_caja_id: corteId,
      });
      toast.success('Cuenta cobrada');
      onCharged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo cobrar');
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Cobrar ${cuenta.mesa?.etiqueta ?? ''}`} size="md">
      <p className="text-sm text-muted mb-3">Subtotal: ${cuenta.subtotal} — agrega propina si aplica.</p>
      {cuenta.gift_card_id ? (
        <p className="text-sm text-emerald-700 mb-3">Gift card aplicada: -${cuenta.descuento_gift_card}</p>
      ) : (
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Código de gift card"
            value={giftCardCodigo}
            onChange={(e) => setGiftCardCodigo(e.target.value.toUpperCase())}
            className="border border-line rounded-xl px-3 py-2 text-sm flex-1 font-mono"
          />
          <Button size="sm" variant="secondary" loading={aplicandoGiftCard} onClick={aplicarGiftCard}>Aplicar</Button>
        </div>
      )}
      <Field label="Propina" type="number" value={propina} onChange={(e) => setPropina(e.target.value)} />
      <p className="text-sm font-medium mb-2">Pagos (split bill / pago mixto)</p>
      {pagos.map((p, i) => (
        <div key={i} className="flex gap-2 mb-2 items-center">
          <input
            type="number" value={p.monto}
            onChange={(e) => setPagos((prev) => prev.map((pp, idx) => (idx === i ? { ...pp, monto: e.target.value } : pp)))}
            className="border border-line rounded-xl px-3 py-2 text-sm w-28"
          />
          <select
            value={p.metodo_pago}
            onChange={(e) => setPagos((prev) => prev.map((pp, idx) => (idx === i ? { ...pp, metodo_pago: e.target.value as any } : pp)))}
            className="border border-line rounded-xl px-3 py-2 text-sm flex-1"
          >
            {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {pagos.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => setPagos((prev) => prev.filter((_, idx) => idx !== i))}>✕</Button>
          )}
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => setPagos((prev) => [...prev, { monto: '0', metodo_pago: 'efectivo' }])}>
        + Dividir pago
      </Button>
      <p className="text-xs text-muted mt-2">
        Total a cubrir: ${(Number(cuenta.subtotal) + Number(propina || 0)).toFixed(2)} — suma de pagos: ${sumaPagos.toFixed(2)}
      </p>
      <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={cobrar}>Cobrar</Button>
      </div>
    </Modal>
  );
}
