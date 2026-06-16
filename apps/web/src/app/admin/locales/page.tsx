'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

type EstadoFilter = 'todos' | 'al_corriente' | 'prueba' | 'pendiente' | 'pago_externo' | 'suspendidos';

const FILTROS: { value: EstadoFilter; label: string; tone: string }[] = [
  { value: 'todos',         label: 'Todos',          tone: 'bg-line/40 text-ink' },
  { value: 'al_corriente',  label: 'Al corriente',   tone: 'bg-emerald-50 text-emerald-700' },
  { value: 'prueba',        label: 'En prueba',      tone: 'bg-amber-50 text-amber-700' },
  { value: 'pendiente',     label: 'Con pago atrasado', tone: 'bg-red-50 text-red-700' },
  { value: 'pago_externo',  label: 'Pago externo',   tone: 'bg-violet-50 text-violet-700' },
  { value: 'suspendidos',   label: 'Suspendidos',    tone: 'bg-zinc-100 text-zinc-700' },
];

export default function LocalesAdminPage() {
  const [items, setItems] = useState<LocalAdmin[] | null>(null);
  const [q,      setQ]      = useState('');
  const [estado, setEstado] = useState<EstadoFilter>('todos');
  const [creating, setCreating] = useState(false);
  const [editingBilling, setEditingBilling] = useState<LocalAdmin | null>(null);

  const refresh = async () => {
    setItems(null);
    const params: Record<string, string | undefined> = { q: q || undefined };
    if (estado === 'suspendidos') params.estado = 'suspendidos';
    else if (estado !== 'todos') params.estado = 'activos';
    const { data } = await api.get<{ data: LocalAdmin[] }>('/admin/locales', { params });
    setItems(data.data);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [q, estado]);

  // Filtros que el backend no soporta directamente → client-side
  const filtered = useMemo(() => {
    if (!items) return null;
    if (estado === 'al_corriente') return items.filter((l) => l.plan_status === 'active' && !l.pago_externo);
    if (estado === 'prueba')       return items.filter((l) => l.plan_status === 'trialing');
    if (estado === 'pendiente')    return items.filter((l) => l.plan_status === 'past_due');
    if (estado === 'pago_externo') return items.filter((l) => l.pago_externo);
    return items;
  }, [items, estado]);

  const toggleSuspendido = async (l: LocalAdmin) => {
    const action = l.suspendido ? 'reactivar' : 'suspender';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${l.nombre}"?`)) return;
    try {
      await api.post(`/admin/locales/${l.id}/${action}`);
      toast.success(`Local ${action === 'suspender' ? 'suspendido' : 'reactivado'}`);
      refresh();
    } catch {
      toast.error(`No se pudo ${action}`);
    }
  };

  const handleDelete = async (l: LocalAdmin) => {
    if (!confirm(`¿ELIMINAR el local "${l.nombre}"?\n\nQuedará oculto en todos lados, pero los datos se conservan.`)) return;
    try {
      await api.delete(`/admin/locales/${l.id}`);
      toast.success('Local eliminado');
      refresh();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  // Conteos para los chips
  const counts = useMemo(() => {
    const c = { todos: 0, al_corriente: 0, prueba: 0, pendiente: 0, pago_externo: 0, suspendidos: 0 };
    (items ?? []).forEach((l) => {
      c.todos++;
      if (l.suspendido) c.suspendidos++;
      if (l.pago_externo) c.pago_externo++;
      if (l.plan_status === 'active' && !l.pago_externo) c.al_corriente++;
      if (l.plan_status === 'trialing') c.prueba++;
      if (l.plan_status === 'past_due') c.pendiente++;
    });
    return c;
  }, [items]);

  return (
    <div>
      <AdminPageHeader
        kicker="Panel global"
        kickerIcon="store"
        title="Tus locales,"
        titleAccent="bajo control."
        description="Alta, branding, suscripciones y suspensiones — todo desde aquí."
        actions={(
          <Button onClick={() => setCreating(true)} className="inline-flex items-center gap-2">
            <Icon name="plus" size={14} />
            Nuevo local
          </Button>
        )}
      />

      {/* Buscador */}
      <div className="mt-4 mb-3">
        <input
          placeholder="Buscar por nombre o slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-4 py-2.5 border border-line rounded-2xl bg-white"
        />
      </div>

      {/* Filtros como chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTROS.map((f) => {
          const active = estado === f.value;
          const count = (counts as any)[f.value] ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => setEstado(f.value)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                active ? 'bg-ink text-white border-transparent shadow-soft' : `${f.tone} border-line hover:border-ink/40`,
              )}
            >
              {f.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full tabular-nums',
                active ? 'bg-white/20' : 'bg-white/70 text-ink/70',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid de cards */}
      {filtered === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="store" size={32} className="text-muted mx-auto" />
          <p className="ce-display text-lg font-bold mt-3">Sin locales para este filtro</p>
          <p className="text-sm text-muted mt-1">Cambia el filtro o crea uno nuevo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <LocalCard
              key={l.id}
              local={l}
              onSuspend={() => toggleSuspendido(l)}
              onDelete={() => handleDelete(l)}
              onEditBilling={() => setEditingBilling(l)}
            />
          ))}
        </div>
      )}

      <CreateLocalModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => { setCreating(false); refresh(); }}
      />

      <BillingModal
        local={editingBilling}
        onClose={() => setEditingBilling(null)}
        onSaved={() => { setEditingBilling(null); refresh(); }}
      />
    </div>
  );
}

/* ─────────────────── Card por local ─────────────────── */
function LocalCard({
  local, onSuspend, onDelete, onEditBilling,
}: {
  local: LocalAdmin;
  onSuspend: () => void;
  onDelete: () => void;
  onEditBilling: () => void;
}) {
  const badge = computeBillingBadge(local);

  return (
    <div className="rounded-3xl border border-line bg-white overflow-hidden hover:shadow-soft hover:border-ink/30 transition-all group">
      {/* Header: logo + nombre + slug */}
      <div className="p-4 flex items-start gap-3">
        <LocalAvatar local={local} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/${local.slug}`} target="_blank" rel="noopener noreferrer" className="font-bold text-base hover:underline truncate">
              {local.nombre}
            </Link>
            <Link
              href={`/${local.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-ink"
              title="Ver landing"
            >
              <Icon name="arrow-up-right" size={12} />
            </Link>
          </div>
          <p className="text-xs text-muted truncate">/{local.slug}</p>
          {local.tagline && (
            <p className="text-xs text-ink/60 line-clamp-1 mt-0.5 italic">"{local.tagline}"</p>
          )}
        </div>
      </div>

      {/* Estado de facturación + suspendido */}
      <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onEditBilling}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition hover:opacity-80',
            badge.tone,
          )}
          title="Cambiar facturación"
        >
          <span>{badge.icon}</span>
          {badge.label}
          <Icon name="settings" size={10} className="opacity-60" />
        </button>
        {local.suspendido && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-red-100 text-red-700">
            <Icon name="lock" size={10} />
            Suspendido
          </span>
        )}
      </div>

      {/* Datos de contacto */}
      <div className="px-4 pb-4 space-y-1 text-xs text-muted border-b border-line">
        <p className="flex items-center gap-1.5"><Icon name="message-circle" size={11} /> {local.whatsapp || '—'}</p>
        {local.direccion && (
          <p className="flex items-center gap-1.5 truncate"><Icon name="map-pin" size={11} /> {local.direccion}</p>
        )}
      </div>

      {/* Acciones */}
      <div className="px-2 py-2 grid grid-cols-5 gap-1">
        <CardAction href={`/admin/locales/${local.id}/branding`} icon="palette" label="Editar" />
        <CardAction href={`/admin/locales/${local.id}/usuarios`} icon="users"   label="Usuarios" />
        <button
          onClick={onEditBilling}
          className="inline-flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl hover:bg-line/40 text-xs font-medium transition"
          title="Cambiar plan / facturación"
        >
          <Icon name="card" size={14} className="text-muted" />
          <span className="text-[10px]">Plan</span>
        </button>
        <button
          onClick={onSuspend}
          className="inline-flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl hover:bg-line/40 text-xs font-medium transition"
          title={local.suspendido ? 'Reactivar' : 'Suspender'}
        >
          <Icon name={local.suspendido ? 'check-circle' : 'lock'} size={14} className="text-muted" />
          <span className="text-[10px]">{local.suspendido ? 'Reactivar' : 'Suspender'}</span>
        </button>
        <button
          onClick={onDelete}
          className="inline-flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl hover:bg-red-50 text-xs font-medium text-red-600 transition"
          title="Borrar"
        >
          <Icon name="x" size={14} />
          <span className="text-[10px]">Borrar</span>
        </button>
      </div>
    </div>
  );
}

function LocalAvatar({ local }: { local: LocalAdmin }) {
  if (local.logo_url) {
    return (
      <img
        src={local.logo_url}
        alt={local.nombre}
        className="w-12 h-12 rounded-2xl object-cover border border-line shrink-0 bg-white"
      />
    );
  }
  const initial = local.nombre?.[0]?.toUpperCase() ?? '?';
  return (
    <div
      className="w-12 h-12 rounded-2xl shrink-0 grid place-items-center text-white font-bold text-lg"
      style={{ background: local.color_primario || '#0B0B0F' }}
      aria-label={local.nombre}
    >
      {initial}
    </div>
  );
}

function CardAction({ href, icon, label }: { href: string; icon: 'palette' | 'users' | 'card'; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl hover:bg-line/40 text-xs font-medium transition"
    >
      <Icon name={icon} size={14} className="text-muted" />
      <span className="text-[10px]">{label}</span>
    </Link>
  );
}

/* ─────────── Badge de facturación ─────────── */
function computeBillingBadge(l: LocalAdmin): { label: string; tone: string; icon: string } {
  if (l.pago_externo) {
    return { label: 'Pago externo', tone: 'bg-violet-50 text-violet-700 border-violet-200', icon: '$' };
  }
  switch (l.plan_status) {
    case 'active':   return { label: 'Al corriente',   tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '✓' };
    case 'trialing': return { label: 'En prueba',      tone: 'bg-amber-50 text-amber-700 border-amber-200',       icon: '·' };
    case 'past_due': return { label: 'Pago atrasado',  tone: 'bg-red-50 text-red-700 border-red-200',             icon: '!' };
    case 'canceled': return { label: 'Cancelado',      tone: 'bg-zinc-100 text-zinc-600 border-zinc-200',         icon: '×' };
    case 'incomplete': return { label: 'Alta incompleta', tone: 'bg-amber-50 text-amber-700 border-amber-200',    icon: '…' };
    default:         return { label: 'Sin plan',       tone: 'bg-zinc-50 text-zinc-500 border-zinc-200',          icon: '·' };
  }
}

/* ─────────── Modal: cambiar facturación manualmente ─────────── */
function BillingModal({
  local, onClose, onSaved,
}: {
  local: LocalAdmin | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pagoExterno, setPagoExterno] = useState(false);
  const [notas,       setNotas]       = useState('');
  const [planStatus,  setPlanStatus]  = useState<string>('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!local) return;
    setPagoExterno(!!local.pago_externo);
    setNotas(local.pago_externo_notas ?? '');
    setPlanStatus(local.plan_status ?? '');
  }, [local]);

  if (!local) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/admin/locales/${local.id}/billing`, {
        pago_externo:        pagoExterno,
        pago_externo_notas:  pagoExterno ? (notas || null) : null,
        plan_status:         planStatus || null,
      });
      toast.success('Facturación actualizada');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!local} onClose={onClose} title={`Facturación · ${local.nombre}`} size="md">
      <div className="space-y-5">
        {/* Toggle pago externo */}
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
          <Switch
            label="Cobro fuera del sistema"
            hint="El cliente paga en efectivo o por transferencia — el sistema deja de exigirle Stripe."
            checked={pagoExterno}
            onChange={setPagoExterno}
          />
          {pagoExterno && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-ink/80 block mb-1">Nota interna (opcional)</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej. paga por transferencia los 1 de cada mes"
                maxLength={250}
                className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-white"
              />
            </div>
          )}
        </div>

        {/* Cambio manual de plan_status */}
        <div>
          <p className="text-sm font-semibold mb-2">Estado de la suscripción</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'active',     label: 'Al corriente',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { value: 'trialing',   label: 'En prueba',        tone: 'bg-amber-50 text-amber-700 border-amber-200' },
              { value: 'past_due',   label: 'Pago atrasado',    tone: 'bg-red-50 text-red-700 border-red-200' },
              { value: 'canceled',   label: 'Cancelado',        tone: 'bg-zinc-50 text-zinc-700 border-zinc-200' },
            ].map((opt) => {
              const active = planStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlanStatus(opt.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium border transition',
                    active ? 'bg-ink text-white border-transparent shadow-soft' : `${opt.tone} hover:border-ink/40`,
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-2">
            Si marcas <strong>al corriente</strong> sin Stripe activo, el local accede al panel sin restricciones.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar facturación</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────── Modal de alta (sin cambios funcionales) ─────────── */
const GIROS = [
  { value: 'mexicana',   label: 'Cocina mexicana' },
  { value: 'italiana',   label: 'Pizzería / italiana' },
  { value: 'cafeteria',  label: 'Cafetería' },
  { value: 'sushi',      label: 'Sushi / japonesa' },
  { value: 'postres',    label: 'Postres / repostería' },
  { value: 'bar',        label: 'Bar / coctelería' },
  { value: 'vegan',      label: 'Healthy / vegana' },
  { value: 'pasteleria', label: 'Pastelería' },
] as const;

function CreateLocalModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [giro, setGiro] = useState<string>('');
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [direccion, setDireccion] = useState('');
  const [colorPrimario, setColorPrimario] = useState('#FF2D2D');

  const [withOwner, setWithOwner] = useState(true);
  const [ownerNombre, setOwnerNombre] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(''); setSlug(''); setGiro(''); setTagline(''); setWhatsapp(''); setDireccion('');
    setColorPrimario('#FF2D2D');
    setWithOwner(true); setOwnerNombre(''); setOwnerEmail(''); setOwnerPassword('');
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!slug && nombre) {
      const auto = nombre.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setSlug(auto);
    }
  /* eslint-disable-next-line */ }, [nombre]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const payload: any = {
        nombre,
        slug: slug || undefined,
        giro: giro || undefined,
        tagline: tagline || undefined,
        whatsapp,
        direccion: direccion || undefined,
        color_primario: colorPrimario,
      };
      if (withOwner) {
        payload.owner = {
          nombre: ownerNombre,
          email: ownerEmail,
          password: ownerPassword,
          password_confirmation: ownerPassword,
        };
      }
      await api.post<Resource<LocalAdmin>>('/admin/locales', payload);
      toast.success(`Local "${nombre}" creado`);
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) {
        toast.error(err?.response?.data?.message ?? 'No se pudo crear');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Dar de alta un local" size="lg">
      <form onSubmit={onSubmit}>
        <h3 className="ce-display font-bold mb-3">Local</h3>
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.nombre} maxLength={120} />
        <Field
          label="Slug (URL pública)"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          hint={`Quedará en /${slug || 'mi-local'}`}
          error={errors.slug}
          maxLength={80}
        />
        {/* Giro: pre-llena productos placeholder */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Tipo de local <span className="text-muted text-xs">(opcional, precarga 8 productos)</span></label>
          <select
            value={giro}
            onChange={(e) => setGiro(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded-xl bg-white"
          >
            <option value="">— Empezar con menú vacío —</option>
            {GIROS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          {giro && (
            <p className="text-xs text-muted mt-1">Vamos a crear categorías y 8 productos típicos. Podrás editarlos después.</p>
          )}
        </div>

        <Textarea label="Eslogan (opcional)" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} error={errors.tagline} />
        <Field label="WhatsApp (con LADA, sólo dígitos)" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))} required hint="p.ej. 5215512345678" error={errors.whatsapp} maxLength={20} />
        <Field label="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} error={errors.direccion} maxLength={300} />

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Color primario</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value.toUpperCase())}
              className="h-10 w-12 rounded-lg border border-line cursor-pointer"
            />
            <input
              type="text"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              className="flex-1 px-3 py-2 border border-line rounded-xl font-mono text-sm bg-white"
              maxLength={9}
            />
          </div>
          {errors.color_primario && <span className="block text-xs text-red-600 mt-1">{errors.color_primario}</span>}
        </div>

        <hr className="my-5 border-line" />

        <div className="flex items-center justify-between mb-3">
          <h3 className="ce-display font-bold">Owner del local</h3>
          <label className="text-sm flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={withOwner}
              onChange={(e) => setWithOwner(e.target.checked)}
            />
            Crear ahora
          </label>
        </div>

        {withOwner ? (
          <div className="rounded-xl border border-line p-4 mb-3">
            <Field label="Nombre del owner" value={ownerNombre} onChange={(e) => setOwnerNombre(e.target.value)} required={withOwner} error={errors['owner.nombre']} maxLength={120} />
            <Field label="Email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required={withOwner} error={errors['owner.email']} />
            <Field label="Contraseña" type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} required={withOwner} hint="Mínimo 8 caracteres" error={errors['owner.password']} minLength={8} />
            <p className="text-xs text-muted mt-1">El owner recibirá acceso al panel del local. Puedes cambiarlo después.</p>
          </div>
        ) : (
          <p className="text-sm text-muted mb-3">El local quedará sin owner — podrás asignarle uno más tarde.</p>
        )}

        <div className="flex gap-2 justify-end pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Crear local</Button>
        </div>
      </form>
    </Modal>
  );
}
