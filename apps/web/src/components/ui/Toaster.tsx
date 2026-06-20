'use client';

import dynamic from 'next/dynamic';

// SEV-Bonus — Sileo Toaster.
//
// IMPORTANTE: sileo (a través de su dependencia `motion`) toca `window` y
// `document` al cargarse el módulo. En `next build` con `output: 'standalone'`
// el bundle SSR del server Passenger intenta importar el archivo y crashea
// antes de servir el primer request (HTTP 503 — el peor escenario).
//
// La solución correcta es deshabilitar el SSR de este componente. Next.js lo
// soporta nativo vía `next/dynamic` con `{ ssr: false }`. El cliente lo carga
// con un pequeño split chunk; el server jamás importa sileo.
const SileoToaster = dynamic(
  () => import('sileo').then((m) => m.Toaster),
  { ssr: false },
);

export function Toaster() {
  return (
    <SileoToaster
      position="bottom-right"
      theme="system"
      offset={{ bottom: 16, right: 16 }}
    />
  );
}
