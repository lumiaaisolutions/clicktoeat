# Frontend — Sistema de loaders

> Tres mecanismos de loader que cubren todas las transiciones del usuario.
> Todos viven en `apps/web/src/components/ui/`.

## Los tres mecanismos

| Mecanismo | Cuándo se ve | z-index |
|-----------|--------------|---------|
| `<InitialLoader />` | Carga inicial + recarga (F5/Cmd+R) | 200 |
| `<RouteTransition />` | Cambio de pathname (navegación) | 190 |
| `app/**/loading.tsx` (Next.js) | Server Component pendiente de data | 150 |

Coexisten sin pelearse — el de mayor z-index gana visualmente y los
otros se desmontan/aparecen detrás.

## `<BrandLoader />` — el visual

Componente base, **no tiene lógica de visibilidad** (solo dibuja).
Lo usan los tres mecanismos.

Contenido:
- Logo mark (cuadrado redondeado con cursor + tenedor)
- Halo animado expandiéndose (`scale: 1 → 1.6, opacity: 0.35 → 0`)
- Breathing scale del mark (`1 → 1.05`)
- Wordmark "Click[To]Eat" fade-in delayed
- "CARGANDO" en tracking widest
- 3 dots con bounce staggered

Prop `compact={true}` quita los mesh gradient orbs de fondo — útil para
overlays muy breves donde los orbs son distracción.

## `<InitialLoader />` — mount inicial y recarga

```tsx
// layout.tsx
<body>
  <InitialLoader />
  <RouteTransition />
  {children}
</body>
```

Lógica:
- `useState(true)` — inicial idéntico en SSR y cliente, **sin hydration mismatch**.
- `useEffect` con `setTimeout(setVisible(false), 500)` — duración mínima visible.
- `AnimatePresence` + `exit: { opacity: 0 }` para fade-out 450 ms.

Sin librería extra, sin tricks. La duración mínima 500 ms se sintió bien
en pruebas: si la app carga en 80 ms, el loader igual se ve unos cuantos
frames y da sensación de marca.

## `<RouteTransition />` — cambio de página

```tsx
const pathname = usePathname();
const firstRender = useRef(true);
useEffect(() => {
  if (firstRender.current) { firstRender.current = false; return; }
  setShowing(true);
  setTimeout(() => setShowing(false), 600);
}, [pathname]);
```

Notas:
- **El primer render NO dispara** — eso ya lo cubre `InitialLoader`.
- Cada cambio posterior: fade-in 250 ms → 600 ms visible → fade-out 250 ms.
- Usa `BrandLoader compact` para ser más rápido visualmente.
- App Router no emite eventos como `next/router`. La única forma reactiva
  es escuchar `usePathname()`.

Si la navegación es **instantánea** (página ya cacheada client-side), aún se
ve el loader 600 ms. Es intencional: da sensación de premier UX, hay tiempo
para que el `loading.tsx` de Next se monte si hay data fetch.

## `app/**/loading.tsx` — Suspense de RSC

Next.js los muestra automáticamente mientras un Server Component está esperando
data fetch:

```
app/
├── loading.tsx              ← Para `/` y cualquier ruta hija sin su propio loading
├── admin/
│   └── loading.tsx          ← compact (overlay menos prominente en admin)
└── [slug]/
    └── loading.tsx          ← Para landings individuales
```

Cada archivo exporta default un componente que renderiza `<BrandLoader />`
dentro de un wrapper `fixed inset-0 z-[150]`.

Razón del `compact` en admin: en el panel ya hay layout/sidebar visible al
navegar entre vistas. Un loader con orbs full-page sentiría brusco.

## Decisiones de diseño

- **500 ms mínimos** en InitialLoader: balance entre "se ve la marca" y
  "no estorbo".
- **600 ms en RouteTransition**: tiempo justo para una transición notoria
  sin frustar.
- **No hay loading spinner inline** dentro de cards/listas — usamos
  `<Skeleton />` del kit UI cuando hay sub-cargas dentro de una página.
- **No mostramos progreso** (%). Hace promesas que no podemos cumplir.

## Limitaciones conocidas

1. **`prefers-reduced-motion`** no está respetado todavía. TODO en
   [`scroll-animations.md`](./scroll-animations.md#accesibilidad).
2. **Pre-fetching** de Next 14 hace que algunas rutas estén pre-cacheadas.
   El loader aparece igualmente — no se puede saber a priori si la transición
   será instantánea.
3. **Form submissions** (login, crear producto) no disparan el RouteTransition
   porque no cambia el pathname hasta después del submit. Si se quiere
   loader durante submit, usar `isPending` del action / state local en el form.

## Ver también

- [`directorio-publico.md`](./directorio-publico.md) — Dónde se monta el sistema
- [`scroll-animations.md`](./scroll-animations.md) — Otras animaciones del landing
