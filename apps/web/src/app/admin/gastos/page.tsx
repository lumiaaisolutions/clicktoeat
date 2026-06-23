'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, downloadFile } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Select, Switch, Textarea } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Gasto {
  id: number;
  categoria: string;
  concepto: string;
  monto_centavos: number;
  fecha: string;
  recurrente: boolean;
  notas: string | null;
  comprobante_url: string | null;
}

interface ResumenCategoria {
  categoria: string;
  total_mxn: number;
  total_centavos: number;
  cantidad: number;
}

interface Resumen {
  mes: string;
  total_mxn: number;
  total_centavos: number;
  total_prev_mxn: number;
  delta_pct: number | null;
  por_categoria: ResumenCategoria[];
}

// Catálogo de categorías — el slug coincide con el backend (Gasto::CATEGORIAS).
const CATEGORIAS: { slug: string; label: string; emoji: string }[] = [
  { slug: 'luz',                   label: 'Luz',                    emoji: '💡' },
  { slug: 'agua',                  label: 'Agua',                   emoji: '💧' },
  { slug: 'gas',                   label: 'Gas',                    emoji: '🔥' },
  { slug: 'internet',              label: 'Internet',               emoji: '🌐' },
  { slug: 'telefono',              label: 'Teléfono',               emoji: '📞' },
  { slug: 'renta',                 label: 'Renta',                  emoji: '🏠' },
  { slug: 'nomina',                label: 'Nómina',                 emoji: '👥' },
  { slug: 'mantenimiento',         label: 'Mantenimiento',          emoji: '🔧' },
  { slug: 'marketing',             label: 'Marketing',              emoji: '📣' },
  { slug: 'impuestos',             label: 'Impuestos',              emoji: '📋' },
  { slug: 'seguros',               label: 'Seguros',                emoji: '🛡️' },
  { slug: 'comisiones_bancarias',  label: 'Comisiones bancarias',   emoji: '🏦' },
  { slug: 'otros',                 label: 'Otros',                  emoji: '📦' },
];

const SLUG_TO_META = Object.fromEntries(CATEGORIAS.map((c) => [c.slug, c]));

function mxn(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function mesActualString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function GastosPage() {
  const [gastos, setGastos]   = useState<Gasto[] | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [mes, setMes]         = useState<string>(mesActualString());
  const [catFiltro, setCatFiltro] = useState<string>('');
  const [open, setOpen]       = useState<Gasto | null | 'new'>(null);

  const cargar = async () => {
    setGastos(null);
    setResumen(null);
    try {
      const params: Record<string, string> = { mes };
      if (catFiltro) params.categoria = catFiltro;
      const [list, sum] = await Promise.all([
        api.get<{ data: Gasto[] }>('/gastos', { params }),
        api.get<{ data: Resumen }>('/gastos/resumen', { params: { mes } }),
      ]);
      setGastos(list.data.data);
      setResumen(sum.data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al cargar gastos');
    }
  };

  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mes, catFiltro]);

  // Picker de meses — últimos 12 + el actual
  const opcionesMes = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({
        value: v,
        label: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      });
    }
    return out;
  }, []);

  return (
    <div>
      <AdminPageHeader
        kicker="Gastos"
        kickerIcon="bell"
        title="Lleva el control"
        titleAccent="de tus gastos."
        description="Registra luz, agua, gas, renta y demás gastos operativos. Mira el total mensual y compáralo con el mes anterior."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const params: Record<string, string> = { mes };
                  if (catFiltro) params.categoria = catFiltro;
                  await downloadFile('/gastos/export', params);
                } catch {
                  toast.error('No se pudo descargar el CSV');
                }
              }}
            >
              <Icon name="download" size={14} className="mr-1.5" />CSV
            </Button>
            <Button onClick={() => setOpen('new')}><Icon name="plus" size={14} className="mr-1.5" />Registrar gasto</Button>
          </div>
        }
      />

      {/* Resumen del mes */}
      <ResumenCard resumen={resumen} mes={mes} opcionesMes={opcionesMes} onMesChange={setMes} />

      {/* Filtro por categoría */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs uppercase tracking-wider font-bold text-muted">Filtrar:</span>
        <button
          onClick={() => setCatFiltro('')}
          className={cn(
            'text-xs px-3 py-1.5 rounded-full border transition',
            catFiltro === '' ? 'bg-ink text-white border-ink' : 'bg-white border-line hover:border-ink/40',
          )}
        >
          Todas
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCatFiltro(catFiltro === c.slug ? '' : c.slug)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1',
              catFiltro === c.slug ? 'bg-ink text-white border-ink' : 'bg-white border-line hover:border-ink/40',
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Lista de gastos */}
      <div className="mt-4">
        {gastos === null ? (
          <Skeleton className="h-48" />
        ) : gastos.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-muted text-sm">
              No hay gastos {catFiltro && `de ${SLUG_TO_META[catFiltro]?.label.toLowerCase()}`} en este mes.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setOpen('new')}>
              Registrar el primero
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {gastos.map((g) => (
              <li key={g.id} className="rounded-2xl border border-line bg-white p-4 flex items-start gap-3">
                <span className="text-2xl shrink-0">{SLUG_TO_META[g.categoria]?.emoji ?? '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold truncate">{g.concepto}</p>
                    <p className="text-lg font-bold ce-display whitespace-nowrap">{mxn(g.monto_centavos / 100)}</p>
                  </div>
                  <div className="text-xs text-muted flex items-center gap-2 mt-1">
                    <span>{SLUG_TO_META[g.categoria]?.label ?? g.categoria}</span>
                    <span>·</span>
                    <span>{new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                    {g.recurrente && <><span>·</span><span className="text-amber-700">🔁 Recurrente</span></>}
                  </div>
                  {g.notas && <p className="text-xs text-ink/70 mt-1 line-clamp-2">{g.notas}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setOpen(g)}>Editar</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal crear/editar */}
      {open && (
        <GastoModal
          gasto={open === 'new' ? null : open}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); void cargar(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function ResumenCard({
  resumen, mes, opcionesMes, onMesChange,
}: {
  resumen: Resumen | null;
  mes: string;
  opcionesMes: { value: string; label: string }[];
  onMesChange: (v: string) => void;
}) {
  const maxCat = resumen?.por_categoria[0]?.total_centavos ?? 0;

  return (
    <div className="rounded-3xl border border-line bg-white p-5 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted">Total del mes</p>
          {resumen === null ? (
            <Skeleton className="h-9 w-40 mt-1" />
          ) : (
            <>
              <p className="text-3xl font-bold ce-display">{mxn(resumen.total_mxn)}</p>
              {resumen.delta_pct !== null && (
                <p className={cn(
                  'text-xs mt-1',
                  resumen.delta_pct > 0 ? 'text-red-600' : 'text-emerald-700',
                )}>
                  {resumen.delta_pct > 0 ? '▲' : '▼'} {Math.abs(resumen.delta_pct)}% vs mes anterior ({mxn(resumen.total_prev_mxn)})
                </p>
              )}
            </>
          )}
        </div>
        <select
          value={mes}
          onChange={(e) => onMesChange(e.target.value)}
          aria-label="Mes a consultar"
          className="px-3 py-2 min-h-[40px] border border-line rounded-xl bg-white outline-none transition text-sm focus:border-ink/60 focus:ring-2 focus:ring-ink/10 capitalize"
        >
          {opcionesMes.map((o) => <option key={o.value} value={o.value} className="capitalize">{o.label}</option>)}
        </select>
      </div>

      {/* Barras horizontales por categoría */}
      {resumen && resumen.por_categoria.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {resumen.por_categoria.slice(0, 6).map((c) => {
            const meta = SLUG_TO_META[c.categoria];
            const pct  = maxCat > 0 ? (c.total_centavos / maxCat) * 100 : 0;
            return (
              <div key={c.categoria}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span>{meta?.emoji ?? '📦'} {meta?.label ?? c.categoria}</span>
                  <span className="font-semibold tabular-nums">{mxn(c.total_mxn)} <span className="text-muted">· {c.cantidad}</span></span>
                </div>
                <div className="h-2 bg-line/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */

function GastoModal({
  gasto, onClose, onSaved,
}: {
  gasto: Gasto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoria, setCategoria] = useState(gasto?.categoria ?? 'luz');
  const [concepto, setConcepto]   = useState(gasto?.concepto ?? '');
  const [montoMxn, setMontoMxn]   = useState(gasto ? (gasto.monto_centavos / 100).toFixed(2) : '');
  const [fecha, setFecha]         = useState(gasto?.fecha ?? new Date().toISOString().slice(0, 10));
  const [recurrente, setRecurrente] = useState(gasto?.recurrente ?? false);
  const [notas, setNotas]         = useState(gasto?.notas ?? '');
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(gasto?.comprobante_url ?? null);
  const [busy, setBusy]           = useState(false);
  const [uploading, setUploading] = useState(false);

  const subirComprobante = async (file: File) => {
    if (!gasto) {
      toast.error('Primero guarda el gasto y luego adjunta el comprobante.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('comprobante', file);
      const r = await api.post<{ data: Gasto }>(`/gastos/${gasto.id}/comprobante`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setComprobanteUrl(r.data.data.comprobante_url);
      toast.success('Comprobante subido');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al subir');
    } finally { setUploading(false); }
  };

  const borrarComprobante = async () => {
    if (!gasto) return;
    if (!confirm('¿Quitar el comprobante?')) return;
    setUploading(true);
    try {
      await api.delete(`/gastos/${gasto.id}/comprobante`);
      setComprobanteUrl(null);
      toast.success('Comprobante eliminado');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al borrar');
    } finally { setUploading(false); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        categoria,
        concepto: concepto.trim(),
        monto_mxn: parseFloat(montoMxn),
        fecha,
        recurrente,
        notas: notas.trim() || null,
      };
      if (gasto) {
        await api.patch(`/gastos/${gasto.id}`, payload);
        toast.success('Gasto actualizado');
      } else {
        await api.post('/gastos', payload);
        toast.success('Gasto registrado');
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!gasto) return;
    if (!confirm('¿Borrar este gasto? Se puede recuperar desde la papelera más tarde.')) return;
    setBusy(true);
    try {
      await api.delete(`/gastos/${gasto.id}`);
      toast.success('Gasto eliminado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al borrar');
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={gasto ? 'Editar gasto' : 'Registrar gasto'}>
      <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        {CATEGORIAS.map((c) => (
          <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
        ))}
      </Select>

      <Field
        label="Concepto"
        placeholder="CFE bimestral mayo-junio"
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        required
      />

      <Field
        label="Monto (MXN)"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="1234.56"
        value={montoMxn}
        onChange={(e) => setMontoMxn(e.target.value)}
        required
      />

      <Field
        label="Fecha del gasto"
        type="date"
        max={new Date().toISOString().slice(0, 10)}
        value={fecha}
        onChange={(e) => setFecha(e.target.value)}
        required
      />

      <Switch
        label="Es un gasto recurrente"
        hint="Marca esto si se paga cada mes (renta, servicios, etc.)"
        checked={recurrente}
        onChange={setRecurrente}
      />

      <Textarea
        label="Notas (opcional)"
        rows={2}
        placeholder="Comparativo con mes anterior, número de factura, etc."
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
      />

      {/* Comprobante — disponible una vez que el gasto existe */}
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">Comprobante (opcional)</label>
        {!gasto ? (
          <p className="text-xs text-muted">Guarda el gasto primero, luego podrás adjuntar la foto o el PDF del recibo.</p>
        ) : comprobanteUrl ? (
          <div className="flex items-center gap-3 rounded-xl border border-line p-2 bg-bg/40">
            {/^https?:.+\.(png|jpe?g|webp)$/i.test(comprobanteUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={comprobanteUrl} alt="Comprobante" className="w-14 h-14 object-cover rounded-lg border border-line" />
            ) : (
              <span className="w-14 h-14 grid place-items-center rounded-lg border border-line bg-white text-2xl">📄</span>
            )}
            <div className="flex-1 min-w-0">
              <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline truncate block">
                Ver comprobante
              </a>
              <p className="text-xs text-muted">Click para abrir en una pestaña nueva.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={borrarComprobante} disabled={uploading} className="text-red-600">
              Quitar
            </Button>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirComprobante(f);
                e.target.value = '';
              }}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-ink file:text-white file:cursor-pointer file:font-medium hover:file:bg-ink/80 disabled:opacity-50"
            />
            <p className="text-xs text-muted mt-1">Imagen JPG/PNG/WEBP o PDF, máx 5 MB.</p>
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
        <Button onClick={save} loading={busy} disabled={!concepto || !montoMxn}>
          {gasto ? 'Guardar cambios' : 'Registrar'}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
        {gasto && (
          <Button variant="ghost" onClick={remove} disabled={busy} className="ml-auto text-red-600">
            Eliminar
          </Button>
        )}
      </div>
    </Modal>
  );
}
