'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Staff } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/store/auth';

export default function StaffPage() {
  const me = useAuth((s) => s.user);
  const [items, setItems] = useState<Staff[] | null>(null);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setItems(null);
    try {
      const { data } = await api.get<{ data: Staff[] }>('/local/staff');
      setItems(data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No pudimos cargar el equipo');
      setItems([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = async (s: Staff) => {
    if (!confirm(`¿Eliminar a "${s.nombre}"? Su acceso se corta inmediatamente.`)) return;
    try {
      await api.delete(`/local/staff/${s.id}`);
      toast.success('Empleado eliminado');
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar');
    }
  };

  return (
    <div>
      <header className="flex items-center justify-between mb-4 md:mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="ce-display text-2xl md:text-4xl font-bold">Equipo</h1>
          <p className="text-muted text-sm mt-1">Owner + staff con acceso a este local.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Nuevo empleado</Button>
      </header>

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted text-sm">
          No tienes empleados todavía.
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg/50 border-b border-line">
              <tr>
                <th className="text-left p-3 font-medium">Nombre</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Email</th>
                <th className="text-left p-3 font-medium">Rol</th>
                <th className="text-right p-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const isMe = me?.id === s.id;
                const isOwner = s.rol === 'owner';
                const canEdit = !isMe && !isOwner;
                return (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{s.nombre}</div>
                      <div className="text-xs text-muted md:hidden">{s.email}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted">{s.email}</td>
                    <td className="p-3">
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs',
                        s.rol === 'owner' ? 'bg-accent/10 text-accent' : 'bg-bg text-muted',
                      )}>
                        {s.rol}
                        {isMe ? ' (tú)' : ''}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {canEdit ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditing(s)}
                            className="text-sm text-muted hover:text-ink"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">
                          {isMe ? 'Edita en Perfil' : 'No editable'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <StaffFormModal
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); refresh(); }}
        />
      )}

      {editing && (
        <StaffFormModal
          staff={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function cn(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

// ─────────────────────────────────────────────────────────────────

interface StaffFormModalProps {
  staff?: Staff;
  onClose: () => void;
  onSaved: () => void;
}

function StaffFormModal({ staff, onClose, onSaved }: StaffFormModalProps) {
  const editing = !!staff;
  const [nombre, setNombre]   = useState(staff?.nombre ?? '');
  const [email, setEmail]     = useState(staff?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload: Record<string, string> = { nombre, email };
    if (password) {
      if (password !== confirmation) {
        setErrors({ password: 'Las contraseñas no coinciden' });
        setLoading(false);
        return;
      }
      payload.password = password;
      payload.password_confirmation = confirmation;
    }
    if (!editing && !password) {
      setErrors({ password: 'Requerida al crear' });
      setLoading(false);
      return;
    }

    try {
      if (editing) {
        await api.patch(`/local/staff/${staff!.id}`, payload);
        toast.success('Empleado actualizado');
      } else {
        await api.post('/local/staff', payload);
        toast.success('Empleado creado');
      }
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        const flat: Record<string, string> = {};
        Object.entries(apiErrors).forEach(([k, v]) => (flat[k] = (v as string[])[0]));
        setErrors(flat);
      } else {
        toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Editar ${staff!.nombre}` : 'Nuevo empleado'}>
      <form onSubmit={submit}>
        <Field
          label="Nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errors.nombre}
        />
        <Field
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          type="password"
          minLength={8}
          required={!editing}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={editing ? 'Dejá vacío para no cambiarla. Mínimo 8 chars con letras y números.' : 'Mínimo 8 chars con letras y números.'}
          error={errors.password}
        />
        {password && (
          <Field
            label="Confirmar contraseña"
            type="password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        )}

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-line text-muted hover:text-ink"
          >
            Cancelar
          </button>
        </div>

        {editing && password && (
          <p className="text-xs text-muted mt-3 inline-flex items-start gap-1.5">
            <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0 text-amber-600" />
            <span>Al cambiar la contraseña, todas las sesiones activas del empleado se cierran.</span>
          </p>
        )}
      </form>
    </Modal>
  );
}
