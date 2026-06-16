'use client';

import { create } from 'zustand';

/**
 * Estado del Centro de Ayuda + Tour interactivo.
 *
 * - openTour(slug) → arranca el tour del módulo `slug` y marca como visto.
 * - openHelp(slug) → abre el panel de ayuda mostrando la sección `slug`.
 * - dismiss()      → cierra cualquier panel/tour activo.
 *
 * Persiste en localStorage qué tours ya viste para auto-trigger SOLO la
 * primera vez que entras a un módulo.
 */

const SEEN_KEY = 'clicktoeat:tour-seen';

function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function writeSeen(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

interface HelpState {
  /** Slug del tour activo (ej. 'productos', 'pedidos'). null = cerrado. */
  activeTour: string | null;
  /** Slug del Centro de Ayuda activo (panel lateral). null = cerrado. */
  activeHelp: string | null;
  /** Tours ya vistos por el usuario. */
  seen: Set<string>;

  openTour(slug: string): void;
  openHelp(slug: string): void;
  dismiss(): void;
  /** Marca el tour como visto (sin abrirlo). Útil para "saltar tour". */
  markSeen(slug: string): void;
  /** ¿Debería arrancar el tour automáticamente la primera vez? */
  shouldAutoTour(slug: string): boolean;
}

export const useHelpCenter = create<HelpState>((set, get) => ({
  activeTour: null,
  activeHelp: null,
  seen: typeof window === 'undefined' ? new Set() : readSeen(),

  openTour: (slug) => {
    const seen = new Set(get().seen);
    seen.add(slug);
    writeSeen(seen);
    set({ activeTour: slug, activeHelp: null, seen });
  },

  openHelp: (slug) => set({ activeHelp: slug, activeTour: null }),

  dismiss: () => set({ activeTour: null, activeHelp: null }),

  markSeen: (slug) => {
    const seen = new Set(get().seen);
    seen.add(slug);
    writeSeen(seen);
    set({ seen });
  },

  shouldAutoTour: (slug) => !get().seen.has(slug),
}));
