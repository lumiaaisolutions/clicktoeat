'use client';

import { useEffect } from 'react';
import { useHelpCenter } from '@/store/helpCenter';

/**
 * Hijo mudo del admin layout. Al montar, si el usuario nunca vio el tour
 * 'bienvenida', lo dispara automáticamente. Solo corre en `/admin` (Inicio)
 * para no interrumpir si el usuario aterrizó directo en otra ruta.
 */
export function AutoTourTrigger({ pathname }: { pathname: string | null }) {
  const openTour       = useHelpCenter((s) => s.openTour);
  const shouldAutoTour = useHelpCenter((s) => s.shouldAutoTour);

  useEffect(() => {
    if (pathname !== '/admin') return;
    if (!shouldAutoTour('bienvenida')) return;
    // Pequeño delay para que el sidebar termine de renderizar
    const t = setTimeout(() => openTour('bienvenida'), 600);
    return () => clearTimeout(t);
  }, [pathname, shouldAutoTour, openTour]);

  return null;
}
