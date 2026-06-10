'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface LocalUser {
  id: number;
  nombre: string;
  email: string;
  rol: 'owner' | 'super_admin' | string;
}

export default function LocalUsuariosPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Resource<LocalAdmin>>(`/admin/locales/${id}`).then((r) => r.data.data),
      api.get<Resource<LocalUser[]>>(`/admin/locales/${id}/usuarios`).then((r) => r.data.data),
    ])
      .then(([loc, us]) => { setLocal(loc); setUsers(us); })
      .catch(() => toast.error('No se pudo cargar el local'))
      .finally(() => setLoading(false));
  }, [id]);

  const owner = users.find((u) => u.rol === 'owner');

  const generatePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let p = '';
    for (let i = 0; i < 14; i++) p += charset[Math.floor(Math.random() * charset.length)];
    setPwd(p); setConfirm(p);
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (pwd.length < 8) { setErrors({ password: 'Mínimo 8 caracteres.' }); return; }
    if (pwd !== confirm) { setErrors({ password_confirmation: 'No coinciden.' }); return; }
    if (!owner) { toast.error('Este local no tiene owner.'); return; }

    setSaving(true);
    try {
      await api.patch(`/admin/locales/${id}/owner-password`, {
        password: pwd,
        password_confirmation: confirm,
        user_id: owner.id,
      });
      toast.success(`Contraseña de ${owner.email} reseteada. Sus sesiones se cerraron.`);
      setPwd(''); setConfirm('');
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      toast.error(err?.response?.data?.message ?? 'No se pudo resetear');
    } finally {
      setSaving(false);
    }
  };

  const copyPwd = async () => {
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  if (loading || !local) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm flex items-center gap-3">
        <Link href="/admin/locales" className="text-muted hover:underline">← Locales</Link>
        <span className="text-muted">·</span>
        <Link href={`/admin/locales/${id}/branding`} className="text-muted hover:underline">Branding</Link>
        <span className="text-muted">·</span>
        <span className="font-medium">Usuarios</span>
      </div>

      <header className="mb-6">
        <h1 className="ce-display text-3xl md:text-4xl font-bold">Usuarios</h1>
        <p className="text-muted text-sm mt-1">
          Administrando accesos de <strong>{local.nombre}</strong>
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de usuarios del local */}
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-1">
          <h2 className="ce-display font-bold mb-4">Usuarios del local</h2>
          {users.length === 0 ? (
            <p className="text-sm text-muted">Sin usuarios asignados.</p>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const initials = u.nombre.trim().split(/\s+/).slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? '').join('') || '·';
                const isOwner = u.rol === 'owner';
                return (
                  <li key={u.id} className="flex items-center gap-3 p-2 rounded-xl border border-line">
                    <div className={cn(
                      'shrink-0 w-9 h-9 rounded-full grid place-items-center text-xs font-semibold',
                      isOwner ? 'bg-emerald-100 text-emerald-700' : 'bg-line text-ink',
                    )}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{u.nombre}</div>
                      <div className="text-[11px] text-muted truncate">{u.email}</div>
                    </div>
                    <span className={cn(
                      'text-[9px] uppercase tracking-wider font-medium px-1.5 py-px rounded',
                      isOwner ? 'bg-emerald-100 text-emerald-700' : 'bg-line text-muted',
                    )}>
                      {isOwner ? 'Owner' : u.rol}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Reset password del owner */}
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="ce-display font-bold mb-1">Resetear contraseña del owner</h2>
          {owner ? (
            <>
              <p className="text-sm text-muted mb-4">
                Vas a fijar una nueva contraseña para <strong>{owner.email}</strong>.
                Sus sesiones activas se cerrarán automáticamente.
              </p>

              <form onSubmit={onReset} className="max-w-md space-y-1">
                <Field
                  label="Nueva contraseña"
                  type="text"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  error={errors.password}
                  hint="Mínimo 8 caracteres. Compártela con el owner por canal seguro."
                  autoComplete="new-password"
                  required
                />
                <Field
                  label="Confirmar contraseña"
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.password_confirmation}
                  autoComplete="new-password"
                  required
                />
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Button type="submit" loading={saving}>Resetear contraseña</Button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 rounded-xl border border-line text-sm hover:bg-line/30"
                  >
                    Generar segura
                  </button>
                  {pwd && (
                    <button
                      type="button"
                      onClick={copyPwd}
                      className="px-3 py-2 rounded-xl border border-line text-sm hover:bg-line/30"
                    >
                      Copiar
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <div className="rounded-xl border border-line bg-line/20 p-4 text-sm">
              Este local no tiene un usuario con rol <code>owner</code> asignado. Crea uno desde la BD o desde el endpoint de gestión de locales.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
