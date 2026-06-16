'use client';

import { useEffect, useState } from 'react';
import { useHelpCenter } from '@/store/helpCenter';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';

/**
 * Hijo mudo del admin layout. Auto-dispara tours según contexto:
 *  - `bienvenida`: en /admin si el user nunca lo vio.
 *  - `multi-sucursal`: en cualquier ruta del admin si el user tiene >= 2
 *    locales y nunca vio el tour. Solo se dispara DESPUÉS del de bienvenida.
 */
export function AutoTourTrigger({ pathname }: { pathname: string | null }) {
  const openTour       = useHelpCenter((s) => s.openTour);
  const shouldAutoTour = useHelpCenter((s) => s.shouldAutoTour);
  const seenBienvenida = useHelpCenter((s) => s.seen.has('bienvenida'));
  const user           = useAuth((s) => s.user);
  const [localesCount, setLocalesCount] = useState<number | null>(null);

  // Cargar # de locales del user (1 = sin tour multi-sucursal)
  useEffect(() => {
    if (!user || user.rol === 'super_admin') return;
    api.get<{ data: Array<{ id: number }> }>('/me/locales')
      .then(({ data }) => setLocalesCount(data.data.length))
      .catch(() => setLocalesCount(0));
  }, [user]);

  // Bienvenida — solo en /admin
  useEffect(() => {
    if (pathname !== '/admin') return;
    if (!shouldAutoTour('bienvenida')) return;
    const t = setTimeout(() => openTour('bienvenida'), 600);
    return () => clearTimeout(t);
  }, [pathname, shouldAutoTour, openTour]);

  // Multi-sucursal — solo si tiene >= 2 locales y ya vio bienvenida.
  useEffect(() => {
    if (!seenBienvenida) return;
    if (localesCount === null || localesCount < 2) return;
    if (!shouldAutoTour('multi-sucursal')) return;
    const t = setTimeout(() => openTour('multi-sucursal'), 1500);
    return () => clearTimeout(t);
  }, [seenBienvenida, localesCount, shouldAutoTour, openTour]);

  return null;
}
