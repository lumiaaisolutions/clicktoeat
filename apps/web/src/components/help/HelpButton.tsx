'use client';

import { useHelpCenter } from '@/store/helpCenter';
import { Icon } from '@/components/ui/Icon';

/**
 * Botón redondo "?" que dispara el tour del módulo actual. Cuando no hay
 * tour configurado para el slug, igual abre el Centro de Ayuda en la sección
 * correspondiente.
 *
 * Aparece en el header de cada módulo (vía `<AdminPageHeader tourSlug="..." />`)
 * y también como botón flotante global en mobile.
 */
export function HelpButton({ tourSlug, variant = 'inline' }: { tourSlug: string; variant?: 'inline' | 'floating' }) {
  const openTour = useHelpCenter((s) => s.openTour);

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={() => openTour(tourSlug)}
        aria-label="Ayuda y tour del módulo"
        className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-ink text-white shadow-glass grid place-items-center hover:scale-105 active:scale-95 transition lg:hidden tap-target"
      >
        <Icon name="help" size={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openTour(tourSlug)}
      aria-label="Cómo funciona este módulo"
      title="Cómo funciona este módulo"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line bg-white text-xs font-semibold text-ink/80 hover:text-ink hover:border-ink/40 transition tap-target"
    >
      <Icon name="help" size={14} />
      <span className="hidden sm:inline">Cómo funciona</span>
    </button>
  );
}
