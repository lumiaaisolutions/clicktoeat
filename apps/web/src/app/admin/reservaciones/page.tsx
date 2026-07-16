'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

interface Reservacion {
  id: number;
  cliente_nombre: string;
  cliente_telefono: string;
  fecha_hora: string;
  personas: number;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'cumplida';
  notas: string | null;
}

const ESTADO_COLOR: Record<Reservacion['estado'], string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  cumplida: 'bg-line text-muted',
};

export default function ReservacionesPage() {
  const [items, setItems] = useState<Reservacion[] | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const { data } = await api.get<{ data: Reservacion[] }>('/reservaciones');
    setItems(data.data);
  };
  useEffect(() => { refresh(); }, []);

  const cambiarEstado = async (r: Reservacion, estado: Reservacion['estado']) => {
    try {
      await api.patch(`/reservaciones/${r.id}`, { estado });
      refresh();
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const remove = async (r: Reservacion) => {
    if (!confirm(`¿Eliminar la reservación de ${r.cliente_nombre}?`)) return;
    try {
      await api.delete(`/reservaciones/${r.id}`);
      toast.success('Eliminada');
      refresh();
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Salón" kickerIcon="clock"
        title="Reservaciones" titleAccent="de tus clientes."
        actions={<Button onClick={() => setCreating(true)}>+ Nueva reservación</Button>}
      />

      {items === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="clock" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Sin reservaciones</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{r.cliente_nombre} · {r.personas} personas</p>
                  <p className="text-xs text-muted">{new Date(r.fecha_hora).toLocaleString('es-MX')} · {r.cliente_telefono}</p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', ESTADO_COLOR[r.estado])}>
                  {r.estado}
                </span>
                {r.estado === 'pendiente' && (
                  <Button size="sm" variant="ghost" onClick={() => cambiarEstado(r, 'confirmada')}>Confirmar</Button>
                )}
                {r.estado !== 'cancelada' && r.estado !== 'cumplida' && (
                  <Button size="sm" variant="ghost" onClick={() => cambiarEstado(r, 'cancelada')}>Cancelar</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>Borrar</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ReservacionModal open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
    </div>
  );
}

function ReservacionModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaHora, setFechaHora] = useState('');
  const [personas, setPersonas] = useState('2');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(''); setTelefono(''); setFechaHora(''); setPersonas('2'); setErrors({});
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.post('/reservaciones', {
        cliente_nombre: nombre, cliente_telefono: telefono,
        fecha_hora: fechaHora, personas: Number(personas),
      });
      toast.success('Reservación creada');
      onSaved();
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(apiErrors)) flat[k] = (v as string[])[0];
      setErrors(flat);
      if (!Object.keys(flat).length) toast.error('No se pudo crear');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva reservación" size="sm">
      <form onSubmit={submit}>
        <Field label="Nombre del cliente" value={nombre} onChange={(e) => setNombre(e.target.value)} required error={errors.cliente_nombre} />
        <Field label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} required error={errors.cliente_telefono} />
        <Field label="Fecha y hora" type="datetime-local" value={fechaHora} onChange={(e) => setFechaHora(e.target.value)} required error={errors.fecha_hora} />
        <Field label="Personas" type="number" min={1} value={personas} onChange={(e) => setPersonas(e.target.value)} required error={errors.personas} />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
