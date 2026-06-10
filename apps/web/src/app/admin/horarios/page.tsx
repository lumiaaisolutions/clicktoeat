'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { HorarioSlot, HorariosResponse } from '@/lib/types';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const DIAS: { key: HorarioSlot['dia']; label: string }[] = [
  { key: 'lun', label: 'Lunes' },
  { key: 'mar', label: 'Martes' },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves' },
  { key: 'vie', label: 'Viernes' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
];

interface DiaState {
  abierto: boolean;
  open:    string;
  close:   string;
}

export default function HorariosPage() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [cerradoTemp, setCerradoTemp] = useState(false);
  const [zona,    setZona]    = useState('America/Mexico_City');
  const [dias,    setDias]    = useState<Record<HorarioSlot['dia'], DiaState>>(() =>
    Object.fromEntries(DIAS.map((d) => [d.key, { abierto: false, open: '11:00', close: '21:00' }])) as any,
  );
  const [estado, setEstado] = useState<HorariosResponse['estado'] | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get<{ data: HorariosResponse }>('/local/horarios').then(({ data }) => {
      if (!alive) return;
      setCerradoTemp(!!data.data.cerrado_temporal);
      setZona(data.data.zona_horaria);
      setEstado(data.data.estado);

      const next: Record<HorarioSlot['dia'], DiaState> = Object.fromEntries(
        DIAS.map((d) => [d.key, { abierto: false, open: '11:00', close: '21:00' }]),
      ) as any;
      for (const h of data.data.horarios) {
        next[h.dia] = { abierto: true, open: h.open, close: h.close };
      }
      setDias(next);
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const toggleDia = (dia: HorarioSlot['dia']) => {
    setDias((d) => ({ ...d, [dia]: { ...d[dia], abierto: !d[dia].abierto } }));
  };
  const setHora = (dia: HorarioSlot['dia'], campo: 'open' | 'close', valor: string) => {
    setDias((d) => ({ ...d, [dia]: { ...d[dia], [campo]: valor } }));
  };

  const copiarATodos = (dia: HorarioSlot['dia']) => {
    const { open, close } = dias[dia];
    setDias((d) => {
      const next = { ...d };
      for (const k of DIAS) {
        next[k.key] = { ...next[k.key], abierto: true, open, close };
      }
      return next;
    });
    toast.success('Aplicado a todos los días');
  };

  const horariosArray: HorarioSlot[] = useMemo(
    () => DIAS.filter((d) => dias[d.key].abierto).map((d) => ({
      dia:   d.key,
      open:  dias[d.key].open,
      close: dias[d.key].close,
    })),
    [dias],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch<{ data: HorariosResponse }>('/local/horarios', {
        horarios: horariosArray,
        cerrado_temporal: cerradoTemp,
      });
      setEstado(data.data.estado);
      toast.success('Horarios guardados');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="mb-4 md:mb-6">
        <h1 className="ce-display text-2xl md:text-4xl font-bold">Horarios</h1>
        <p className="text-muted text-sm mt-1">
          Define cuándo está abierto tu local. La landing pública muestra
          el estado <strong>Abierto / Cerrado</strong> calculado en vivo.
        </p>
      </header>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
      ) : (
        <>
          {/* Estado actual */}
          {estado && (
            <div className={cn(
              'rounded-2xl p-4 mb-4 flex items-center gap-3 border',
              estado.abierto === true ? 'bg-emerald-50 border-emerald-200' :
              estado.abierto === false ? 'bg-red-50 border-red-200' :
              'bg-amber-50 border-amber-200',
            )}>
              <span className="text-2xl">
                {estado.abierto === true ? '🟢' : estado.abierto === false ? '🔴' : '⚪️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {estado.abierto === true ? 'Abierto ahora' :
                   estado.abierto === false ? 'Cerrado' :
                   'Sin horario configurado'}
                </p>
                <p className="text-xs text-muted truncate">{estado.mensaje}</p>
              </div>
            </div>
          )}

          {/* Override de cierre temporal */}
          <div className="rounded-2xl border border-line bg-white p-4 mb-4">
            <Switch
              label="Cerrar temporalmente"
              hint="Fuerza el estado Cerrado en la landing aunque el horario diga abierto (día libre, evento privado, agotamos producto…)"
              checked={cerradoTemp}
              onChange={setCerradoTemp}
            />
          </div>

          {/* Días */}
          <div className="space-y-2 mb-6">
            {DIAS.map((d) => {
              const state = dias[d.key];
              return (
                <div key={d.key} className={cn(
                  'rounded-2xl border bg-white p-4 transition',
                  state.abierto ? 'border-line' : 'border-line opacity-60',
                )}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="font-medium w-24">{d.label}</p>
                    <Switch
                      label={state.abierto ? 'Abierto' : 'Cerrado'}
                      checked={state.abierto}
                      onChange={() => toggleDia(d.key)}
                    />
                  </div>
                  {state.abierto && (
                    <div className="flex items-center gap-2 flex-wrap pl-0 sm:pl-24">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted">Abre</label>
                        <input
                          type="time"
                          value={state.open}
                          onChange={(e) => setHora(d.key, 'open', e.target.value)}
                          className="px-2 py-2 border border-line rounded-lg bg-white text-base min-h-[44px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted">Cierra</label>
                        <input
                          type="time"
                          value={state.close}
                          onChange={(e) => setHora(d.key, 'close', e.target.value)}
                          className="px-2 py-2 border border-line rounded-lg bg-white text-base min-h-[44px]"
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => copiarATodos(d.key)}>
                        Copiar a todos
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-line/30">
            <p className="text-xs text-muted">
              Zona horaria: <strong>{zona}</strong>
            </p>
            <Button onClick={onSave} loading={saving}>Guardar horarios</Button>
          </div>
        </>
      )}
    </div>
  );
}
