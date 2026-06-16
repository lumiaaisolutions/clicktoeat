'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface MyLocal {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_primario: string | null;
}

/**
 * Selector "estás viendo este local" para owners con multi-sucursal.
 * Sólo se renderiza si el user tiene 2+ locales asignados. Cambiar de
 * local llama al backend (`POST /me/switch-local/{id}`) y recarga el panel
 * para que toda la data refresque desde el nuevo tenant.
 */
export function LocalSwitcher() {
  const user = useAuth((s) => s.user);
  const [locales, setLocales] = useState<MyLocal[]>([]);
  const [open,    setOpen]    = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!user || user.rol === 'super_admin') return;
    api.get<{ data: MyLocal[] }>('/me/locales')
      .then(({ data }) => setLocales(data.data ?? []))
      .catch(() => setLocales([]));
  }, [user]);

  if (!user || user.rol === 'super_admin' || locales.length < 2) return null;

  const current = locales.find((l) => l.id === user.local_id) ?? locales[0];

  const switchTo = async (l: MyLocal) => {
    if (l.id === user.local_id) { setOpen(false); return; }
    setSwitching(true);
    try {
      await api.post(`/me/switch-local/${l.id}`);
      toast.success(`Cambiado a ${l.nombre}`);
      window.location.reload(); // hard reload para refrescar toda la data
    } catch {
      toast.error('No se pudo cambiar de local');
    } finally {
      setSwitching(false);
      setOpen(false);
    }
  };

  return (
    <div className="px-3 pb-2 relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-line bg-white hover:border-ink/40 transition"
      >
        {current.logo_url ? (
          <img src={current.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover border border-line shrink-0" />
        ) : (
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-xs font-bold shrink-0"
            style={{ background: current.color_primario ?? '#0B0B0F' }}>
            {current.nombre[0]?.toUpperCase()}
          </span>
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold leading-tight">Sucursal activa</p>
          <p className="text-sm font-bold truncate leading-tight">{current.nombre}</p>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} className="text-ink/40 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-10 left-3 right-3 mt-1 rounded-2xl border border-line bg-white shadow-glass overflow-hidden">
          {locales.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => switchTo(l)}
              disabled={switching}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-line/30 transition',
                l.id === current.id && 'bg-ink/5',
              )}
            >
              {l.logo_url ? (
                <img src={l.logo_url} alt="" className="w-6 h-6 rounded-md object-cover border border-line shrink-0" />
              ) : (
                <span className="w-6 h-6 rounded-md grid place-items-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: l.color_primario ?? '#0B0B0F' }}>
                  {l.nombre[0]?.toUpperCase()}
                </span>
              )}
              <span className="flex-1 text-sm font-medium truncate">{l.nombre}</span>
              {l.id === current.id && <Icon name="check" size={12} className="text-emerald-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
