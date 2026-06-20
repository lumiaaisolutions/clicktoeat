# ADR-009 — Sileo Toaster con dynamic import + lazy load

**Fecha**: 2026-06-19
**Status**: aceptado (commit `5d2cdc5`)
**Stakeholders**: Frontend (Next.js), DX

## Contexto

Como parte del bloque naranja de la auditoría de seguridad
(2026-06-19), reemplazamos el toast store custom (Zustand + framer-motion)
por `sileo@0.1.5` — una librería joven (4 meses, single-maintainer, pre-1.0)
de toasts con físicas, basada en `motion@12`.

Necesitamos:

1. Mantener la API pública del store actual (`toast.success/error/info(text)`)
   sin tocar los ~20 archivos que la importan.
2. No crashear el Next.js standalone en Passenger (Node sin DOM).
3. Minimizar bundle size del First Load JS — sileo + motion suman ~30-40 kB.

## Hallazgos al inspeccionar `node_modules/sileo/dist/index.mjs`

```js
// línea 1
'use client';

// línea 2-9
function __insertCSS(code) {
  if (!code || typeof document == 'undefined') return
  let head = document.head || ...
  // ...
}

// línea 14
import { motion } from 'motion/react';

// línea 16 — TOP LEVEL invocation
__insertCSS(":root{--sileo-spring-easing:...");
```

Hay dos riesgos para SSR:

1. **`__insertCSS()` invocado al top level del módulo**. Aunque el guard
   `typeof document == 'undefined' return` lo protege, el módulo aún se
   evalúa en el server bundle si el bundler no respeta el boundary
   `'use client'` (esto pasa en Next.js 14.2.x con paquetes 3rd party).
2. **`import { motion } from 'motion/react'`**. `motion@12` es una librería
   joven con side effects que han causado problemas en Node SSR según
   issues abiertos en GitHub.

## Decisión

**Defensa en dos capas**:

### Capa 1 — `components/ui/Toaster.tsx` usa `next/dynamic`

```tsx
'use client';
import dynamic from 'next/dynamic';

const SileoToaster = dynamic(
  () => import('sileo').then((m) => m.Toaster),
  { ssr: false },   // ← clave
);

export function Toaster() {
  return <SileoToaster position="bottom-right" theme="system" />;
}
```

`{ ssr: false }` garantiza que el bundle server NO incluye sileo. El client
lo carga en un chunk separado cuando hidrata.

### Capa 2 — `store/toast.ts` hace lazy `await import('sileo')`

```ts
'use client';

async function show(kind: 'success'|'error'|'info', text: string) {
  if (typeof window === 'undefined') return;
  const { sileo } = await import('sileo');
  sileo[kind]({ title: text });
}

export const toast = {
  success: (text: string) => { void show('success', text); },
  error:   (text: string) => { void show('error',   text); },
  info:    (text: string) => { void show('info',    text); },
};
```

Sileo NUNCA se evalúa al cargar el módulo. Solo cuando se dispara un toast,
que solo ocurre en cliente.

## Consecuencias

### Positivas

- **First Load JS shared by admin** baja de 226 kB → **179 kB**. ~50 kB ahorrados
  en cada page del admin que antes cargaba sileo eagerly.
- Cero breaking changes — todos los call sites siguen siendo
  `import { toast } from '@/store/toast'` + `toast.success(text)`.
- Aislamiento del riesgo de sileo: si en alguna versión futura sileo rompe
  el SSR, no afecta nuestro server bundle.

### Negativas

- Primera invocación de `toast.X(text)` tras hidratación tiene un delay
  de ~50-200 ms mientras descarga el chunk de sileo. Para toasts UX no es
  perceptible (son inherentemente asíncronos al evento).
- Un test con cypress/playwright que dispare un toast inmediatamente al
  cargar la página puede capturarlo después del delay — adaptar tests si los
  hay.

## Alternativas consideradas

1. **Mantener el toast custom de framer-motion**. Funciona, pero el dev quiso
   el look de Sileo y la lib custom era código que mantener.
2. **Sustituir sileo por `sonner`** (mantenedor de Emil Kowalski, usado por
   Vercel, mucho más maduro). Es mejor opción a largo plazo. Si sileo da
   más problemas en producción, migrar a `sonner` con el mismo adapter
   pattern (cero cambios en call sites).
3. **Inline el sileo en el server bundle con su CSS**. No probado. Riesgo
   alto. Innecesario dado que `dynamic({ssr:false})` resuelve el SSR cleanly.

## Notas para el equipo

- **No importar `sileo` directamente en código del proyecto**. Siempre vía
  el adapter `@/store/toast`. Si necesitas funcionalidad avanzada (botones
  de acción, descripciones largas, promise toasts), extender el adapter en
  vez de hacer un import directo de sileo.
- **Si sileo da problemas a futuro** (un crash en cliente, una regression
  en motion@12, abandono del package), el switch a otra librería de toasts
  es ~30 minutos: solo se toca `Toaster.tsx` + `store/toast.ts`.
- **Versión pinneada**: el deploy actual usa `sileo: ^0.1.5` (caret). Para
  reducir riesgo de breaking changes en 0.x considera pinnear a `0.1.5` exacto:
  ```json
  "sileo": "0.1.5"
  ```

## Verificación

- `npm run typecheck` ✓
- `npm run build` ✓ — bundle delta confirmado en summary
- Smoke en prod: pendiente (deploy bloqueado por outage NPROC, ver
  [`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md))

## Referencias

- Commit: `5d2cdc5` — `fix(web): defer sileo import to prevent SSR crash en Passenger standalone`
- Sileo GitHub: https://github.com/hiaaryan/sileo
- Auditoría: [`docs/security/auditoria-integral-2026-06-19.md`](../security/auditoria-integral-2026-06-19.md)
