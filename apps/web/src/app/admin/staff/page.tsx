'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Staff } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { CreateButton, EditButton, DeleteButton } from '@/components/ui/actions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Wizard } from '@/components/ui/Wizard';
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
      <AdminPageHeader
        kicker="Equipo"
        kickerIcon="users"
        title="Tu equipo,"
        titleAccent="tus permisos."
        description="Invita personas para ayudarte. Tú decides qué módulos puede ver cada uno."
        tourSlug="staff"
        actions={<CreateButton data-tour="staff-nuevo" onClick={() => setCreating(true)} label="Agregar miembro" />}
      />

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
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 self-start px-2 py-0.5 rounded-full text-xs font-medium',
                          s.rol === 'owner' ? 'bg-accent/10 text-accent' : 'bg-bg text-ink/80 border border-line',
                        )}>
                          {s.rol === 'owner' ? 'Owner' : 'Staff'}
                          {isMe ? ' · tú' : ''}
                        </span>
                        {s.rol !== 'owner' && (
                          <span className="text-[10px] text-muted">
                            {s.permisos?.length ?? 0} {s.permisos?.length === 1 ? 'módulo' : 'módulos'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      {canEdit ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <EditButton data-tour="staff-editar" onClick={() => setEditing(s)} />
                          <DeleteButton data-tour="staff-borrar" compact onDelete={() => handleDelete(s)} />
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

/* ─────────── Configuración de roles y módulos ─────────── */

interface ModuloConfig { key: string; label: string; descripcion: string; icon: 'utensils' | 'storefront' | 'truck' | 'clock' | 'qr-code' | 'sparkles' | 'shield' | 'bell' | 'message-circle' }

const MODULOS: ModuloConfig[] = [
  { key: 'pedidos',    label: 'Pedidos',     descripcion: 'Ver y atender pedidos entrantes',     icon: 'bell' },
  { key: 'pos',        label: 'Punto de venta', descripcion: 'Cobrar pedidos en sucursal',         icon: 'storefront' },
  { key: 'mesas',      label: 'Mesas',       descripcion: 'Tomar mesas y ver el salón',          icon: 'storefront' },
  { key: 'caja',       label: 'Caja',        descripcion: 'Cortes, cobros y cuentas de mesa',    icon: 'storefront' },
  { key: 'cocina',     label: 'Cocina',      descripcion: 'Pantalla de preparación de pedidos',  icon: 'utensils' },
  { key: 'mesero',     label: 'Mesero',      descripcion: 'Atender llamados de mesa',            icon: 'message-circle' },
  { key: 'productos',  label: 'Productos',   descripcion: 'Crear y editar el catálogo',          icon: 'utensils' },
  { key: 'categorias', label: 'Categorías',  descripcion: 'Organizar el menú por secciones',     icon: 'utensils' },
  { key: 'inventario', label: 'Inventario',  descripcion: 'Ingredientes y movimientos de stock', icon: 'truck' },
  { key: 'compras',    label: 'Compras',     descripcion: 'Registrar compras a proveedor',       icon: 'truck' },
  { key: 'recetas',    label: 'Recetas',     descripcion: 'Asociar ingredientes a productos',    icon: 'utensils' },
  { key: 'metricas',   label: 'Métricas',    descripcion: 'Ver ventas y reportes',               icon: 'sparkles' },
  { key: 'horarios',   label: 'Horarios',    descripcion: 'Editar horario de atención',          icon: 'clock' },
  { key: 'branding',   label: 'Branding',    descripcion: 'Personalizar la landing pública',     icon: 'sparkles' },
  { key: 'qr',         label: 'QR del menú', descripcion: 'Ver y descargar el QR público',       icon: 'qr-code' },
  { key: 'audit_log',  label: 'Audit log',   descripcion: 'Historial de cambios del local',      icon: 'shield' },
];

interface RolPreset { key: string; label: string; descripcion: string; permisos: string[] }

const ROLES: RolPreset[] = [
  {
    key: 'mesero',
    label: 'Mesero',
    descripcion: 'Toma mesas, levanta pedidos y cobra en el salón',
    permisos: ['pedidos', 'pos', 'mesas', 'caja'],
  },
  {
    key: 'cajero',
    label: 'Cajero',
    descripcion: 'Atiende pedidos y cobra en POS',
    permisos: ['pedidos', 'pos'],
  },
  {
    key: 'cocina',
    label: 'Encargado de cocina',
    descripcion: 'Cocina + pedidos + inventario + recetas + compras',
    permisos: ['pedidos', 'cocina', 'productos', 'recetas', 'inventario', 'compras'],
  },
  {
    key: 'manager',
    label: 'Manager',
    descripcion: 'Casi todo el panel (sin audit log ni branding)',
    permisos: ['pedidos', 'pos', 'mesas', 'caja', 'cocina', 'mesero', 'productos', 'categorias', 'inventario', 'compras', 'recetas', 'metricas', 'horarios', 'qr'],
  },
  {
    key: 'custom',
    label: 'Personalizado',
    descripcion: 'Elige tú los módulos exactos',
    permisos: [],
  },
];

function StaffFormModal({ staff, onClose, onSaved }: StaffFormModalProps) {
  const editing = !!staff;
  const [nombre, setNombre]   = useState(staff?.nombre ?? '');
  const [email, setEmail]     = useState(staff?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [permisos, setPermisos] = useState<string[]>(staff?.permisos ?? ['pedidos']);
  const [rolPreset, setRolPreset] = useState<string>(() => {
    if (!staff) return 'cajero';
    const match = ROLES.find((r) => r.key !== 'custom' &&
      r.permisos.length === (staff.permisos ?? []).length &&
      r.permisos.every((p) => (staff.permisos ?? []).includes(p)));
    return match?.key ?? 'custom';
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [step, setStep]       = useState(1);

  // Si cambian de preset y NO es custom, sobrescribe los permisos
  function pickRolPreset(key: string) {
    setRolPreset(key);
    const preset = ROLES.find((r) => r.key === key);
    if (preset && preset.key !== 'custom') {
      setPermisos(preset.permisos);
    }
  }

  function togglePermiso(key: string) {
    setRolPreset('custom');
    setPermisos((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    );
  }

  // Paso 1: valida datos de acceso antes de avanzar.
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!nombre.trim()) e.nombre = 'Requerido';
    if (!email.trim()) e.email = 'Requerido';
    if (!editing && !password) e.password = 'Requerida al crear';
    if (password && password !== confirmation) e.password = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1) { if (validateStep1()) setStep(2); }
    else doSubmit();
  };

  const doSubmit = async () => {
    setLoading(true);
    setErrors({});

    const payload: Record<string, unknown> = { nombre, email, permisos };
    if (password) {
      payload.password = password;
      payload.password_confirmation = confirmation;
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
    <Modal open onClose={onClose} title={editing ? `Editar ${staff!.nombre}` : 'Nuevo empleado'} size="lg">
      <Wizard
        steps={['Datos de acceso', 'Rol y permisos']}
        current={step}
        onStep={setStep}
        kicker={`Paso ${step} de 2`}
        title={step === 1 ? '¿Quién es y cómo entra?' : '¿Qué puede hacer?'}
        subtitle={step === 1
          ? 'Nombre, correo y contraseña con los que iniciará sesión.'
          : 'Elige un rol predefinido o personaliza los módulos a los que accede.'}
        onCancel={onClose}
        onBack={() => setStep(1)}
        onNext={handleNext}
        saving={loading}
        isLast={step === 2}
        submitLabel={editing ? 'Actualizar' : 'Crear empleado'}
      >
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                data-tour="staff-modal-nombre"
                label="Nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={errors.nombre}
              />
              <Field
                data-tour="staff-modal-email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                data-tour="staff-modal-password"
                label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                type="password"
                minLength={8}
                required={!editing}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={editing ? 'Vacío = no cambiarla. Min 8 chars con letras y números.' : 'Min 8 chars con letras y números.'}
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
            </div>

            {editing && password && (
              <p className="text-xs text-muted inline-flex items-start gap-1.5">
                <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0 text-amber-600" />
                <span>Al cambiar la contraseña, todas las sesiones activas del empleado se cierran.</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Rol preset */}
            <div data-tour="staff-modal-roles">
              <p className="text-sm font-medium mb-2">Rol predefinido</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES.map((r) => {
                  const active = rolPreset === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => pickRolPreset(r.key)}
                      className={cn(
                        'text-left p-3 rounded-2xl border-2 transition',
                        active
                          ? 'border-ink bg-ink/[0.04]'
                          : 'border-line hover:border-ink/40 bg-white',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{r.label}</span>
                        {active && <Icon name="check-circle" size={16} className="text-ink" />}
                      </div>
                      <p className="text-xs text-muted mt-0.5">{r.descripcion}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkboxes de módulos */}
            <div data-tour="staff-modal-permisos">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Acceso a módulos</p>
                <span className="text-[11px] text-muted">
                  {permisos.length} de {MODULOS.length} seleccionados
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MODULOS.map((m) => {
                  const active = permisos.includes(m.key);
                  return (
                    <label
                      key={m.key}
                      className={cn(
                        'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition select-none',
                        active
                          ? 'border-ink/30 bg-ink/[0.03]'
                          : 'border-line hover:border-ink/20 bg-white',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => togglePermiso(m.key)}
                        className="mt-0.5 w-4 h-4 rounded accent-ink"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon name={m.icon} size={13} className="text-ink/70" />
                          <span className="text-sm font-medium">{m.label}</span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">{m.descripcion}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {permisos.length === 0 && (
                <p className="text-[11px] text-red-600 mt-2">
                  Selecciona al menos un módulo. Si dejas vacío, se asigna acceso solo a Pedidos.
                </p>
              )}
            </div>
          </div>
        )}
      </Wizard>
    </Modal>
  );
}
