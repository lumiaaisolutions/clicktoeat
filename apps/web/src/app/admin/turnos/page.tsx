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

interface Staff {
  id: number;
  nombre: string;
}
interface Shift {
  id: number;
  user: Staff | null;
  inicio: string;
  fin: string;
  rol: 'cocina' | 'mesero' | 'caja';
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function TurnosPage() {
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [forecast, setForecast] = useState<Array<{ dow: string; hour: string; total: number }> | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    const [shiftsRes, staffRes, forecastRes] = await Promise.all([
      api.get<{ data: Shift[] }>('/staff-shifts'),
      api.get<{ data: Staff[] }>('/local/staff'),
      api.get<{ data: Array<{ dow: string; hour: string; total: number }> }>('/staff-shifts-forecast'),
    ]);
    setShifts(shiftsRes.data.data);
    setStaff(staffRes.data.data);
    setForecast(forecastRes.data.data);
  };
  useEffect(() => { refresh(); }, []);

  const remove = async (s: Shift) => {
    if (!confirm('¿Eliminar este turno?')) return;
    try { await api.delete(`/staff-shifts/${s.id}`); refresh(); } catch { toast.error('No se pudo eliminar'); }
  };

  const picosDeVolumen = (forecast ?? [])
    .slice().sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div>
      <AdminPageHeader
        kicker="Crecimiento" kickerIcon="users"
        title="Turnos" titleAccent="de tu equipo."
        description="El forecast es un conteo histórico de pedidos por hora/día — no es un modelo predictivo."
        actions={<Button onClick={() => setCreating(true)}>+ Nuevo turno</Button>}
      />

      {forecast !== null && picosDeVolumen.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4 mb-6">
          <p className="text-sm font-medium mb-2">Horas de más volumen (últimos 28 días)</p>
          <ul className="text-sm space-y-1">
            {picosDeVolumen.map((f, i) => (
              <li key={i}>{DIAS[Number(f.dow)] ?? f.dow} {f.hour}:00 — {f.total} pedidos</li>
            ))}
          </ul>
        </div>
      )}

      {shifts === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : shifts.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="clock" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Sin turnos programados</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {shifts.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{s.user?.nombre ?? '—'} · <span className="capitalize">{s.rol}</span></p>
                  <p className="text-xs text-muted">
                    {new Date(s.inicio).toLocaleString('es-MX')} – {new Date(s.fin).toLocaleTimeString('es-MX')}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(s)}>Borrar</Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TurnoModal open={creating} staff={staff ?? []} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refresh(); }} />
    </div>
  );
}

function TurnoModal({
  open, staff, onClose, onSaved,
}: { open: boolean; staff: Staff[]; onClose: () => void; onSaved: () => void }) {
  const [userId, setUserId] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [rol, setRol] = useState<'cocina' | 'mesero' | 'caja'>('mesero');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setUserId(''); setInicio(''); setFin(''); setRol('mesero'); setErrors({}); } }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.post('/staff-shifts', { user_id: Number(userId), inicio, fin, rol });
      toast.success('Turno creado');
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
    <Modal open={open} onClose={onClose} title="Nuevo turno" size="sm">
      <form onSubmit={submit}>
        <Select label="Empleado" value={userId} onChange={(e) => setUserId(e.target.value)} required error={errors.user_id}>
          <option value="">Selecciona...</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <Select label="Rol del turno" value={rol} onChange={(e) => setRol(e.target.value as any)} required>
          <option value="cocina">Cocina</option>
          <option value="mesero">Mesero</option>
          <option value="caja">Caja</option>
        </Select>
        <Field label="Inicio" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} required error={errors.inicio} />
        <Field label="Fin" type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} required error={errors.fin} />
        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}
