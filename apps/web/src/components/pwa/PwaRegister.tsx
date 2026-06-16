'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker `/sw.js` una sola vez por sesión. Sólo en
 * browsers que soporten SW y sólo cuando estemos servidos por HTTPS o
 * localhost (los SW no funcionan en HTTP plano).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const isSecure =
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    if (!isSecure) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => { /* silencioso — no es crítico */ });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
