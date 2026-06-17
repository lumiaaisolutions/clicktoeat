'use client';

import { useEffect } from 'react';

/**
 * F36b — Captura el código de referido (?ref=CODE) que el visitante trae en
 * la URL y lo persiste en localStorage para que el onboarding lo recoja al
 * momento de crear el local. Persiste 60 días.
 *
 * Sin esto, el dueño que comparte su link a otro propietario nunca recibe
 * el descuento porque el código se pierde al navegar a /registro.
 *
 * El componente no renderiza nada — sólo corre un efecto en el cliente.
 */
const KEY = 'ce-ref-code';
const TTL_DAYS = 60;

export function RefCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('ref');
      if (!code) return;
      const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
      if (!clean) return;
      const payload = JSON.stringify({ code: clean, savedAt: Date.now() });
      window.localStorage.setItem(KEY, payload);
    } catch {
      /* localStorage bloqueado (modo privado): ok, descuento se pierde */
    }
  }, []);
  return null;
}

/** Lee el ref guardado si no ha expirado. Lo usa el onboarding al armar el payload del paso `local`. */
export function readStoredRefCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, savedAt } = JSON.parse(raw) as { code: string; savedAt: number };
    if (!code || !savedAt) return null;
    const ageDays = (Date.now() - savedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > TTL_DAYS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

/** Llamar tras consumir el código (post-onboarding finalizado). */
export function clearStoredRefCode() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
