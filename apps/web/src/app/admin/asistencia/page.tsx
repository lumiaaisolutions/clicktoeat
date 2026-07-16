'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface Staff {
  id: number;
  nombre: string;
}

interface Attendance {
  id: number;
  user_id: number;
  user: Staff | null;
  entrada: string;
  salida: string | null;
  horas: number | null;
}

export default function AsistenciaPage() {
  const user = useAuth((s) => s.user);
  const isOwner = user?.rol === 'owner';

  const [abierta, setAbierta] = useState<Attendance | null>(null);
  const [registros, setRegistros] = useState<Attendance[] | null>(null);
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [filtroUserId, setFiltroUserId] = useState('');
  const [working, setWorking] = useState(false);

  const refresh = async (userId?: string) => {
    const [estadoRes, registrosRes] = await Promise.all([
      api.get<{ data: { abierta: Attendance | null } }>('/asistencias/estado'),
      api.get<{ data: Attendance[] }>('/asistencias', { params: userId ? { user_id: userId } : undefined }),
    ]);
    setAbierta(estadoRes.data.data.abierta);
    setRegistros(registrosRes.data.data);
  };

  useEffect(() => {
    refresh();
    if (isOwner) {
      api.get<{ data: Staff[] }>('/local/staff').then(({ data }) => setStaff(data.data)).catch(() => setStaff([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registrarEntrada = async () => {
    setWorking(true);
    try {
      await api.post('/asistencias/entrada');
      toast.success('Entrada registrada');
      await refresh(filtroUserId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo registrar la entrada');
    } finally {
      setWorking(false);
    }
  };

  const registrarSalida = async () => {
    setWorking(true);
    try {
      await api.post('/asistencias/salida');
      toast.success('Salida registrada');
      await refresh(filtroUserId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo registrar la salida');
    } finally {
      setWorking(false);
    }
  };

  const borrar = async (r: Attendance) => {
    if (!confirm('¿Borrar este registro de asistencia?')) return;
    try {
      await api.delete(`/asistencias/${r.id}`);
      refresh(filtroUserId);
    } catch {
      toast.error('No se pudo borrar');
    }
  };

  const onFiltroChange = (value: string) => {
    setFiltroUserId(value);
    refresh(value);
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Equipo" kickerIcon="clock"
        title="Asistencia" titleAccent="entrada y salida."
        description="Registra tu propia entrada y salida. El propietario puede ver y corregir el historial de todo el equipo."
      />

      <div className="rounded-2xl border border-line bg-white p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          {abierta ? (
            <>
              <p className="text-sm text-muted">Entrada registrada</p>
              <p className="font-semibold">{new Date(abierta.entrada).toLocaleString('es-MX')}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Sin entrada abierta.</p>
          )}
        </div>
        {abierta ? (
          <Button onClick={registrarSalida} loading={working} variant="secondary">Registrar salida</Button>
        ) : (
          <Button onClick={registrarEntrada} loading={working}>Registrar entrada</Button>
        )}
      </div>

      {isOwner && staff && staff.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select label="Filtrar por empleado" value={filtroUserId} onChange={(e) => onFiltroChange(e.target.value)}>
            <option value="">Todo el equipo</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </div>
      )}

      {registros === null ? (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-10 text-center">
          <Icon name="clock" size={28} className="text-muted mx-auto" />
          <p className="ce-display text-xl font-bold mt-3">Sin registros todavía</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white overflow-hidden">
          <ul className="divide-y divide-line">
            {registros.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  {isOwner && <p className="font-semibold text-sm">{r.user?.nombre ?? '—'}</p>}
                  <p className="text-xs text-muted">
                    {new Date(r.entrada).toLocaleString('es-MX')}
                    {r.salida ? ` – ${new Date(r.salida).toLocaleTimeString('es-MX')}` : ' – en curso'}
                    {r.horas !== null && ` · ${r.horas}h`}
                  </p>
                </div>
                {isOwner && <Button size="sm" variant="ghost" onClick={() => borrar(r)}>Borrar</Button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
