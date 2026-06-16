'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Field } from '@/components/ui/FormField';
import { cn } from '@/lib/utils';

export default function PerfilPage() {
  const user = useAuth((s) => s.user);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const isSuper = user.rol === 'super_admin';
  const rolLabel = isSuper ? 'Super admin' : user.rol === 'owner' ? 'Propietario' : user.rol;
  const initials = user.nombre.trim().split(/\s+/).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (next.length < 8) {
      setErrors({ password: 'Mínimo 8 caracteres.' });
      return;
    }
    if (next !== confirm) {
      setErrors({ password_confirmation: 'Las contraseñas no coinciden.' });
      return;
    }

    setSaving(true);
    try {
      await api.patch('/me/password', {
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      toast.success('Contraseña actualizada. Las otras sesiones quedaron cerradas.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      toast.error(err?.response?.data?.message ?? 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Mi perfil"
        kickerIcon="users"
        title="Tu cuenta,"
        titleAccent="tu acceso."
        description="Información de tu cuenta y cambio de contraseña."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card identidad */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="ce-display font-bold mb-4">Identidad</h2>
          <div className="flex items-center gap-4">
            <div className={cn(
              'shrink-0 w-14 h-14 rounded-full grid place-items-center text-base font-semibold ring-2 ring-white shadow-soft',
              isSuper ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
            )}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{user.nombre}</div>
              <div className="text-xs text-muted truncate">{user.email}</div>
              <div className="mt-1">
                <span className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-medium uppercase tracking-wider',
                  isSuper ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
                )}>
                  <span className={cn('w-1 h-1 rounded-full', isSuper ? 'bg-violet-500' : 'bg-emerald-500')} />
                  {rolLabel}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-4">
            Para cambiar nombre o email contacta al super admin.
          </p>
        </section>

        {/* Form cambio de contraseña */}
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="ce-display font-bold mb-1">Cambiar contraseña</h2>
          <p className="text-xs text-muted mb-4">
            Por seguridad, te pediremos tu contraseña actual. Las demás sesiones se cerrarán.
          </p>

          <form onSubmit={onSubmit} className="max-w-md">
            <Field
              label="Contraseña actual"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              error={errors.current_password}
              autoComplete="current-password"
              required
            />
            <Field
              label="Nueva contraseña"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={errors.password}
              hint="Mínimo 8 caracteres."
              autoComplete="new-password"
              required
            />
            <Field
              label="Confirmar nueva contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.password_confirmation}
              autoComplete="new-password"
              required
            />
            <Button type="submit" loading={saving} className="mt-2">
              Guardar cambios
            </Button>
          </form>
        </section>

        {/* Notif filtro */}
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-3">
          <NotifFiltroSection />
        </section>

        {/* 2FA */}
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-3">
          <TwoFactorSection />
        </section>
      </div>
    </div>
  );
}

/* ─────────── Filtro de notificación por canal ─────────── */
function NotifFiltroSection() {
  const user = useAuth((s) => s.user);
  const [filtro, setFiltro] = useState<string>('todos');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if ((user as any)?.notif_filtro) setFiltro((user as any).notif_filtro);
  }, [user]);

  const guardar = async (v: string) => {
    setFiltro(v);
    setSaving(true);
    try {
      await api.patch('/me/notif-filtro', { notif_filtro: v });
      toast.success('Filtro actualizado');
    } catch {
      toast.error('No se pudo actualizar');
    } finally { setSaving(false); }
  };

  const opciones = [
    { value: 'todos',    label: 'Todos los pedidos',     hint: 'Recibe pickup, delivery y POS' },
    { value: 'cocina',   label: 'Solo cocina',           hint: 'Pickup y delivery (no POS)' },
    { value: 'caja',     label: 'Solo POS / mostrador',  hint: 'Pedidos en sucursal' },
    { value: 'delivery', label: 'Solo entrega a domicilio', hint: 'Sólo delivery' },
    { value: 'ninguno',  label: 'No me notifiquen',      hint: 'Útil para roles administrativos' },
  ];

  return (
    <div>
      <h2 className="ce-display font-bold mb-1">Recibir notificación de</h2>
      <p className="text-xs text-muted mb-4">
        Filtra qué pedidos te aparecen en el panel y en las notificaciones del navegador.
        El owner siempre recibe todos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => guardar(o.value)}
            disabled={saving}
            className={cn(
              'rounded-2xl border px-4 py-3 text-left transition',
              filtro === o.value ? 'border-ink/60 bg-ink/5 shadow-soft' : 'border-line hover:border-ink/30',
            )}
          >
            <p className="text-sm font-semibold">{o.label}</p>
            <p className="text-[11px] text-muted mt-0.5">{o.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 2FA TOTP ─────────── */
function TwoFactorSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret,  setSecret]  = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [code,    setCode]    = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [busy,    setBusy]    = useState(false);

  useEffect(() => {
    api.get<{ enabled: boolean }>('/auth/2fa/status')
      .then(({ data }) => setEnabled(data.enabled))
      .catch(() => setEnabled(false));
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ secret: string; otpauth_url: string }>('/auth/2fa/setup');
      setSecret(data.secret);
      setOtpauth(data.otpauth_url);
    } catch {
      toast.error('No se pudo iniciar 2FA');
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<{ enabled: boolean; recovery_codes: string[] }>('/auth/2fa/confirm', { code });
      setEnabled(true);
      setRecovery(data.recovery_codes);
      setSecret(null);
      setOtpauth(null);
      setCode('');
      toast.success('2FA activado. Guarda tus códigos de recuperación.');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Código inválido');
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (!confirmDialog('¿Desactivar 2FA?')) return;
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { password });
      setEnabled(false);
      setPassword('');
      toast.success('2FA desactivado');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'No se pudo desactivar');
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 className="ce-display font-bold">Verificación en 2 pasos</h2>
          <p className="text-xs text-muted">
            Cada vez que entres pediremos un código TOTP de tu app (Google Authenticator, 1Password, Authy…).
          </p>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider',
          enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600',
        )}>
          {enabled === null ? 'cargando…' : enabled ? 'Activo' : 'Desactivado'}
        </span>
      </div>

      {/* Setup */}
      {enabled === false && !secret && (
        <Button onClick={startSetup} loading={busy}>Activar 2FA</Button>
      )}

      {secret && otpauth && (
        <div className="rounded-2xl border border-line p-4 bg-line/20">
          <p className="text-sm font-semibold mb-2">1. Escanea con tu app</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`}
            alt="QR 2FA"
            className="w-40 h-40 rounded-xl bg-white border border-line"
          />
          <p className="text-xs text-muted mt-2">¿No puedes escanear? Ingresa esta clave manual:</p>
          <code className="block mt-1 text-sm bg-white px-3 py-2 rounded-lg border border-line font-mono break-all">{secret}</code>

          <p className="text-sm font-semibold mt-4 mb-1">2. Confirma con el código actual</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            placeholder="123456"
            className="w-40 px-3 py-2 rounded-xl border border-line bg-white text-center font-mono tracking-widest"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={confirm} loading={busy} disabled={code.length !== 6}>Confirmar y activar</Button>
            <Button variant="secondary" onClick={() => { setSecret(null); setOtpauth(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {recovery && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mt-4">
          <p className="ce-display font-bold mb-1">Guarda estos códigos en lugar seguro</p>
          <p className="text-xs text-amber-700 mb-3">
            Cada uno sirve para entrar UNA VEZ si pierdes acceso a tu app. No se vuelven a mostrar.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recovery.map((c) => (
              <code key={c} className="bg-white px-3 py-2 rounded-lg border border-amber-200 text-center">{c}</code>
            ))}
          </div>
          <Button variant="secondary" className="mt-3" onClick={() => setRecovery(null)}>Ya los guardé</Button>
        </div>
      )}

      {enabled === true && !secret && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">
            <strong>2FA está activo</strong>. Para desactivarlo, escribe tu contraseña actual.
          </p>
          <div className="flex gap-2 mt-3 max-w-sm">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              className="flex-1 px-3 py-2 rounded-xl border border-line bg-white"
            />
            <Button variant="ghost" onClick={disable} loading={busy} disabled={!password}>Desactivar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function confirmDialog(msg: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.confirm(msg);
}
