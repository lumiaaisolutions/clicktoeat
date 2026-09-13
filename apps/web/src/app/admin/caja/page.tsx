'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { CreateButton, ActionButton } from '@/components/ui/actions';
import { confirmAction } from '@/store/confirm';
import { Field, Select } from '@/components/ui/FormField';
import { Select as USelect } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { InfoBox } from '@/components/ui/InfoBox';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { motion } from 'framer-motion';

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
  mesa: { etiqueta: string; mesero?: { nombre: string } | null } | null;
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
interface CobradoMostrador extends PedidoMostrador {
  metodo_pago: string;
  pagado_at: string | null;
}
const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta_tpv: 'Tarjeta', tarjeta_entrega: 'Tarjeta a entrega', transferencia: 'Transferencia',
};
const METODO_ICON: Record<string, IconName> = {
  efectivo: 'landmark', tarjeta_tpv: 'card', tarjeta_entrega: 'card', transferencia: 'smartphone',
};

// Metadata de presentación para cada tipo de movimiento de caja (íconos, color y microcopy).
const MOV_META: Record<'fondo' | 'retiro' | 'vale', { label: string; icon: IconName; tint: string; signo: '+' | '−'; hint: string }> = {
  fondo:  { label: 'Fondo',  icon: 'arrow-down', tint: '#33B87A', signo: '+', hint: 'Metes dinero a la caja: cambio, fondo extra o un depósito para empezar.' },
  retiro: { label: 'Retiro', icon: 'arrow-up',   tint: '#E15412', signo: '−', hint: 'Sacas dinero de la caja: depósito al banco o entrega a gerencia.' },
  vale:   { label: 'Vale',   icon: 'file-text',  tint: '#B0810E', signo: '−', hint: 'Un gasto o adelanto justificado que sale del efectivo (con motivo).' },
};

/** Encabezado de sección con ícono en pastilla de acento + hint opcional debajo. */
function SectionHeading({ icon, title, hint, right }: { icon: IconName; title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="ce-display font-bold inline-flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-[color:var(--ce-accent,#F26A1F)]/10 text-[color:var(--ce-accent,#F26A1F)]">
            <Icon name={icon} size={15} />
          </span>
          {title}
        </h3>
        {right}
      </div>
      {hint && <p className="text-sm text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

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
  const [cobrados, setCobrados] = useState<CobradoMostrador[] | null>(null);

  const refreshPendientes = async () => {
    const { data } = await api.get<{ data: PedidoMostrador[] }>('/caja/pendientes');
    setPendientes(data.data);
  };

  const refreshCobrados = async () => {
    const { data } = await api.get<{ data: CobradoMostrador[] }>('/caja/cobrados');
    setCobrados(data.data);
  };

  const cobrarMostrador = async (pedidoId: number, metodo: string) => {
    try {
      await api.post(`/pedidos/${pedidoId}/cobrar`, { metodo_pago: metodo, corte_caja_id: corte?.id ?? null });
      toast.success('Pedido cobrado');
      refreshPendientes();
      refreshCobrados();
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
    refreshCobrados();
    const id = setInterval(() => { refreshCuentas(); refreshPendientes(); refreshCobrados(); }, 15_000);
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
        tourSlug="caja"
        actions={<CreateButton onClick={() => setCreatingCaja(true)} label="Nueva caja" />}
      />

      {cajas.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <span className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-2xl bg-[color:var(--ce-accent,#F26A1F)]/10 text-[color:var(--ce-accent,#F26A1F)]">
            <Icon name="landmark" size={22} />
          </span>
          <p className="ce-display text-xl font-bold">Aún no tienes cajas registradas</p>
          <p className="text-sm text-muted mt-1.5 max-w-sm mx-auto">
            Una caja es un punto de cobro (mostrador, barra, terraza…). Crea la primera para
            abrir cortes y empezar a registrar pagos.
          </p>
          <div className="mt-5 flex justify-center">
            <CreateButton onClick={() => setCreatingCaja(true)} label="Crear mi primera caja" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted mb-2">Elige una caja</p>
            <div data-tour="caja-tabs" className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-line/25 p-1">
              {cajas.map((c) => {
                const activa = selectedCajaId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCajaId(c.id)}
                    aria-pressed={activa}
                    className={`relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--ce-accent,#F26A1F)] ${activa ? 'text-white' : 'text-ink/60 hover:text-ink'}`}
                  >
                    {activa && (
                      <motion.span
                        layoutId="caja-pill"
                        className="absolute inset-0 rounded-xl bg-ink shadow-sm"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}
                    <Icon name="landmark" size={14} className="relative z-10" />
                    <span className="relative z-10">{c.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div data-tour="caja-corte" className="rounded-2xl border border-line bg-white p-4 sm:p-5 mb-6">
            {corte === undefined ? (
              <Skeleton className="h-24" />
            ) : corte === null ? (
              <div className="space-y-4">
                <InfoBox>
                  El <strong>corte de caja</strong> es la sesión de trabajo de esta caja: la abres
                  con el efectivo que tienes al empezar, registras entradas y salidas durante el
                  turno, y al cerrar cuentas el efectivo real. El sistema compara lo esperado con
                  lo contado y te muestra la <strong>varianza</strong> (si sobró o faltó dinero).
                </InfoBox>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-dashed border-line bg-line/15 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-white border border-line text-muted shrink-0">
                      <Icon name="lock" size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Esta caja está cerrada</p>
                      <p className="text-sm text-muted">Abre un corte para empezar a cobrar y registrar movimientos.</p>
                    </div>
                  </div>
                  <Button onClick={() => setAbriendo(true)} className="shrink-0">
                    <Icon name="play" size={16} /> Abrir corte
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid place-items-center w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                      <Icon name="landmark" size={20} />
                    </span>
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Corte abierto
                      </span>
                      <p className="text-xs text-muted mt-0.5">Fondo inicial en caja</p>
                      <p className="ce-display font-bold text-lg leading-tight">${corte.monto_inicial}</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setCerrandoCorte(true)}
                    className="shrink-0 border-red-200 text-red-600 hover:bg-red-50/70 hover:border-red-300"
                  >
                    <Icon name="lock" size={16} /> Cerrar corte
                  </Button>
                </div>

                <div>
                  <SectionHeading
                    icon="refresh-cw"
                    title="Movimientos del turno"
                    hint="Cada entrada o salida de efectivo queda registrada para que el cierre cuadre."
                  />
                  <ul className="text-sm rounded-xl border border-line divide-y divide-line mb-4 overflow-hidden">
                    {corte.movimientos.length === 0 && (
                      <li className="text-muted px-3.5 py-3 flex items-center gap-2">
                        <Icon name="list" size={15} className="opacity-60" /> Aún no hay movimientos en este turno.
                      </li>
                    )}
                    {corte.movimientos.map((m) => {
                      const meta = MOV_META[m.tipo];
                      return (
                        <li key={m.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span className="grid place-items-center w-6 h-6 rounded-lg shrink-0" style={{ background: `${meta.tint}1a`, color: meta.tint }}>
                              <Icon name={meta.icon} size={13} />
                            </span>
                            <span className="truncate"><span className="font-medium">{meta.label}</span>{m.motivo ? ` — ${m.motivo}` : ''}</span>
                          </span>
                          <span className="font-semibold tabular-nums shrink-0" style={{ color: meta.tint }}>{meta.signo}${m.monto}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div data-tour="caja-movimiento" className="rounded-xl border border-line bg-line/10 p-3.5">
                    <p className="text-sm font-medium mb-2 inline-flex items-center gap-1.5">
                      <Icon name="plus" size={15} className="text-[color:var(--ce-accent,#F26A1F)]" /> Registrar un movimiento
                    </p>
                    <div className="flex gap-2 flex-wrap items-end">
                      <div className="min-w-[110px]">
                        <label className="block text-[11px] font-medium text-muted mb-1">Tipo</label>
                        <USelect value={movTipo} onChange={(v) => setMovTipo(v as any)} className="text-sm" aria-label="Tipo de movimiento de caja">
                          <option value="fondo">Fondo</option>
                          <option value="retiro">Retiro</option>
                          <option value="vale">Vale</option>
                        </USelect>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted mb-1">Monto</label>
                        <input placeholder="0.00" value={movMonto} onChange={(e) => setMovMonto(e.target.value)} className="border border-line rounded-xl px-3 py-2 text-sm w-24 outline-none focus:border-[color:var(--ce-accent,#F26A1F)]" />
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <label className="block text-[11px] font-medium text-muted mb-1">Motivo (opcional)</label>
                        <input placeholder="Ej. depósito al banco" value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)} className="border border-line rounded-xl px-3 py-2 text-sm w-full outline-none focus:border-[color:var(--ce-accent,#F26A1F)]" />
                      </div>
                      <Button size="md" onClick={agregarMovimiento} disabled={!movMonto}>
                        <Icon name="plus" size={16} /> Agregar
                      </Button>
                    </div>
                    <p className="text-xs text-muted mt-2 flex items-start gap-1.5">
                      <Icon name={MOV_META[movTipo].icon} size={13} className="mt-0.5 shrink-0" style={{ color: MOV_META[movTipo].tint }} />
                      {MOV_META[movTipo].hint}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div data-tour="caja-cobrar">
      <SectionHeading
        icon="store"
        title="Mostrador — por cobrar"
        hint="Pedidos para llevar o de mostrador listos para pagar. Elige el método y quedan cobrados al instante."
      />
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
              <div className="pt-1 mt-auto">
                <p className="text-xs text-muted mb-1.5">Cobrar con:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['efectivo', 'tarjeta_tpv', 'transferencia'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={async () => {
                        const ok = await confirmAction({
                          title: `¿Cobrar $${p.total}?`,
                          message: `Método: ${METODO_LABEL[m]}\nPedido ${p.codigo}. Se registrará el pago y se marcará como cobrado.`,
                          confirmLabel: `Cobrar con ${METODO_LABEL[m]}`,
                        });
                        if (ok) cobrarMostrador(p.id, m);
                      }}
                      className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-line bg-white px-2 py-2.5 text-xs font-semibold text-ink/80 transition-colors hover:border-[color:var(--ce-accent,#F26A1F)] hover:bg-[color:var(--ce-accent,#F26A1F)]/8 hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ce-accent,#F26A1F)]"
                    >
                      <Icon name={METODO_ICON[m]} size={16} className="opacity-70" />
                      {METODO_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      {/* Historial de pagos de mostrador cobrados hoy */}
      <div data-tour="caja-cobrados">
      <SectionHeading
        icon="history"
        title="Cobrados hoy"
        hint="Registro de los pedidos de mostrador que ya pagaron durante el día."
        right={cobrados && cobrados.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-line/40 px-2.5 py-1 text-xs font-medium text-ink/70 shrink-0">
            {cobrados.length} {cobrados.length === 1 ? 'pago' : 'pagos'} · ${cobrados.reduce((s, c) => s + Number(c.total || 0), 0).toFixed(2)}
          </span>
        ) : undefined}
      />
      {cobrados === null ? (
        <Skeleton className="h-16 mb-6" />
      ) : cobrados.length === 0 ? (
        <p className="text-sm text-muted mb-6">Aún no hay pagos registrados hoy. Aparecerán aquí en cuanto cobres un pedido de mostrador.</p>
      ) : (
        <div className="rounded-2xl border border-line bg-white divide-y divide-line mb-6 overflow-hidden">
          {cobrados.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{c.cliente_nombre || c.codigo}</p>
                <p className="text-xs text-muted">
                  {c.pagado_at ? new Date(c.pagado_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.metodo_pago === 'efectivo' ? '#33B87A' : '#5B8DEF' }} />
                    {METODO_LABEL[c.metodo_pago] ?? c.metodo_pago}
                  </span>
                </p>
              </div>
              <span className="ce-display font-bold tabular-nums">${c.total}</span>
            </div>
          ))}
        </div>
      )}

      </div>

      <div data-tour="caja-cuentas">
      <SectionHeading
        icon="utensils"
        title="Cuentas de mesa abiertas"
        hint="Consumos por mesa aún sin pagar. Cobra la cuenta (efectivo, tarjeta o pago dividido) o abre su ticket."
      />
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
              {c.mesa?.mesero?.nombre && (
                <p className="text-xs text-muted inline-flex items-center gap-1.5 -mt-1">
                  <Icon name="users" size={12} />
                  Atiende: <span className="font-medium text-ink">{c.mesa.mesero.nombre}</span>
                </p>
              )}
              <p className="ce-display font-bold text-xl">${c.total}</p>
              <div className="flex items-center gap-1.5 mt-auto pt-1">
                <Button size="sm" onClick={() => setCobrando(c)} className="flex-1"><Icon name="card" size={15} /> Cobrar</Button>
                <ActionButton icon="file-text" label="Ver ticket" href={`/admin/caja/ticket/${c.id}`} newTab />
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

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
        <InfoBox className="mb-4">
          Una <strong>caja</strong> es un punto de cobro de tu local (mostrador, barra, terraza…).
          Cada caja lleva sus propios cortes por separado.
        </InfoBox>
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
      <InfoBox className="mb-4">
        Cuenta el efectivo con el que empieza la caja (el <strong>fondo inicial</strong>) y
        anótalo aquí. Es el punto de partida para calcular cuánto debería haber al cerrar.
      </InfoBox>
      <Field label="Monto inicial en caja" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <div className="flex justify-end gap-2 pt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onConfirm(Number(monto))}><Icon name="play" size={16} /> Abrir corte</Button>
      </div>
    </Modal>
  );
}

function CerrarCorteModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (monto: number) => void }) {
  const [monto, setMonto] = useState('0');
  useEffect(() => { if (open) setMonto('0'); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Cerrar corte" size="sm">
      <InfoBox className="mb-4">
        Cuenta <strong>todo el efectivo</strong> que hay físicamente en la caja y escríbelo aquí.
        Al confirmar, el corte se cierra y se compara con lo esperado: la diferencia es la
        <strong> varianza</strong> (positiva = sobró, negativa = faltó). Esta acción no se puede deshacer.
      </InfoBox>
      <Field label="Monto contado en caja" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <div className="flex justify-end gap-2 pt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => onConfirm(Number(monto))}><Icon name="lock" size={16} /> Cerrar corte</Button>
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
      <InfoBox className="mb-3">
        Cierra la cuenta de la mesa. Puedes aplicar una <strong>gift card</strong>, agregar
        <strong> propina</strong> y dividir el total en varios pagos (efectivo, tarjeta, etc.).
      </InfoBox>
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
          <Button size="sm" variant="secondary" loading={aplicandoGiftCard} onClick={aplicarGiftCard}><Icon name="gift" size={15} /> Aplicar</Button>
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
          <USelect
            value={p.metodo_pago}
            onChange={(v) => setPagos((prev) => prev.map((pp, idx) => (idx === i ? { ...pp, metodo_pago: v as any } : pp)))}
            className="text-sm flex-1"
            aria-label="Método de pago"
          >
            {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </USelect>
          {pagos.length > 1 && (
            <Button size="sm" variant="ghost" onClick={() => setPagos((prev) => prev.filter((_, idx) => idx !== i))}><Icon name="x" size={14} /></Button>
          )}
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => setPagos((prev) => [...prev, { monto: '0', metodo_pago: 'efectivo' }])}>
        <Icon name="plus" size={15} /> Dividir pago
      </Button>
      <p className="text-xs text-muted mt-2">
        Total a cubrir: ${(Number(cuenta.subtotal) + Number(propina || 0)).toFixed(2)} — suma de pagos: ${sumaPagos.toFixed(2)}
      </p>
      <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-line">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button loading={saving} onClick={cobrar}><Icon name="card" size={16} /> Cobrar</Button>
      </div>
    </Modal>
  );
}
