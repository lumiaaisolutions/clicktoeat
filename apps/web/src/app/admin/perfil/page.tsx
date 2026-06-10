'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
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
      <header className="mb-6">
        <h1 className="ce-display text-2xl md:text-4xl font-bold">Mi perfil</h1>
        <p className="text-muted text-sm mt-1">Información de tu cuenta y cambio de contraseña.</p>
      </header>

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
      </div>
    </div>
  );
}
