# ADR-016: Toaster propio (fuera `sileo`)

> **Status:** aceptada — supersede a [ADR-009](ADR-009-sileo-toaster-lazy-import.md)
> **Fecha:** 2026-09-12
> **Decisores:** Frontend (Next.js)

## Contexto

[ADR-009](ADR-009-sileo-toaster-lazy-import.md) adoptó la librería `sileo` para
los toasts, envuelta en dos capas de defensa (`dynamic({ ssr: false })` en
`Toaster.tsx` + `await import('sileo')` perezoso en `store/toast.ts`) para evitar
que su `__insertCSS()` a top-level y su dependencia de `motion@12` crashearan el
SSR del Next.js standalone.

En la práctica esa solución siguió siendo frágil:

- El boundary `'use client'` de `sileo` no siempre se respetaba en el bundle de
  server → riesgo de crash de SSR/lazy-import latente.
- El toast de `sileo` quedaba **por debajo (z-index) de los modales y paneles de
  edición** del panel — un aviso disparado desde dentro de un modal quedaba
  tapado. Fue un bug reportado por el usuario.
- Necesitábamos tipos que `sileo` no daba de fábrica (`warning`/`neutral`,
  descripción larga) sin extender un adapter alrededor de una dependencia joven
  (pre-1.0, single-maintainer).

## Decisión

Removemos `sileo` y usamos un **Toaster propio** con framer-motion, manteniendo
**intacta la API pública** `@/store/toast` (`toast.success/error/info/...`) para
no tocar los ~20 call sites.

- `store/toast.ts` — store propio (suscripción + `push`/`dismiss`/`dismissAll`),
  tipos `success | error | warning | info | neutral`, segundo argumento opcional
  `{ description?, duration? }`, tope de 4 toasts visibles, shim `useToast()`
  legacy.
- `components/ui/Toaster.tsx` — render tipo "notification card" (badge de ícono
  por estado, título + descripción, barra de progreso con pausa al hover, swipe
  para descartar), montado en **portal a `document.body` con `z-index: 1000000`**
  → siempre por encima de modales. Respeta `prefers-reduced-motion`.

## Alternativas consideradas

- **Seguir con `sileo` + adapter** (statu quo de ADR-009): descartado por el
  z-index bajo, la fragilidad SSR y depender de una lib pre-1.0 para algo central.
- **Migrar a `sonner`** (Emil Kowalski / Vercel, maduro): buena opción, pero
  volvía a introducir una dependencia externa y su theming/portal habría que
  adaptarlo igual; el Toaster propio nos da control total del z-index, los
  estados y el look con ~150 líneas.
- **Volver al toast custom viejo de Zustand+framer** (previo a ADR-009): la base,
  pero se rediseñó el look (notification card, swipe, progreso) en vez de revivir
  el anterior.

## Consecuencias

### Positivas

- Toasts **siempre por encima** de modales/paneles (bug resuelto).
- Cero dependencia 3rd-party para toasts; sin riesgo de SSR/lazy-import de `sileo`.
- Estados `warning` y `neutral` disponibles; descripción larga soportada.
- API pública sin cambios → cero migración en los call sites.

### Negativas

- Es código propio que mantener (animaciones, timers, swipe).

### Neutras

- Quitar `sileo` de `package.json`.
- El razonamiento de bundle/lazy-load de ADR-009 deja de aplicar.

## Ver también

- [`../frontend/components.md`](../frontend/components.md) — `Toaster.tsx` + `store/toast.ts`
- [ADR-009](ADR-009-sileo-toaster-lazy-import.md) — decisión superseded
