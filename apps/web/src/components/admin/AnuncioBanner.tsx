'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Anuncio {
  id: number;
  titulo: string;
  body: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
}

const TONES = {
  info:    'bg-blue-50 border-blue-300 text-blue-900',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
  success: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  danger:  'bg-red-50 border-red-300 text-red-900',
};

const DISMISS_KEY = 'ce-anuncio-dismissed';

/**
 * Banner global de anuncios del super_admin. Se muestra en el admin layout
 * para todos los locales. El user puede cerrarlo y se persiste en
 * localStorage por id del anuncio.
 */
export function AnuncioBanner() {
  const user = useAuth((s) => s.user);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      setDismissed(raw ? JSON.parse(raw) : []);
    } catch {}
    api.get<{ data: Anuncio[] }>('/anuncios/activos')
      .then(({ data }) => setAnuncios(data.data))
      .catch(() => setAnuncios([]));
  }, [user]);

  const close = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch {}
  };

  const visibles = anuncios.filter((a) => !dismissed.includes(a.id));
  if (visibles.length === 0) return null;

  return (
    <div className="space-y-1.5 px-3 py-2 sm:px-6">
      {visibles.map((a) => (
        <div
          key={a.id}
          className={cn(
            'rounded-2xl border-2 px-4 py-3 flex items-start gap-3 text-sm',
            TONES[a.severity] ?? TONES.info,
          )}
        >
          <Icon
            name={a.severity === 'danger' ? 'alert-triangle' : a.severity === 'success' ? 'check-circle' : 'bell'}
            size={16}
            className="shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">{a.titulo}</p>
            <p className="text-xs opacity-90 mt-0.5">{a.body}</p>
          </div>
          <button
            type="button"
            onClick={() => close(a.id)}
            aria-label="Cerrar"
            className="shrink-0 opacity-60 hover:opacity-100 transition"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
