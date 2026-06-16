# Frontend — Tour interactivo + Centro de Ayuda

> Sistema de ayuda contextual del admin. Compuesto por:
>  - `useHelpCenter` (Zustand store, `apps/web/src/store/helpCenter.ts`)
>  - `TourOverlay` (modal global, `apps/web/src/components/help/TourOverlay.tsx`)
>  - `AutoTourTrigger` (auto-arranque en primer login)
>  - `HelpButton` (botón "?" inline)
>  - `tours.ts` (catálogo de pasos por módulo)
>  - `/admin/ayuda` (Centro de Ayuda con todas las cards)

## Cómo funciona

1. El usuario entra a `/admin` por primera vez → `AutoTourTrigger` ve que
   `bienvenida` no está en `seen` y dispara `openTour('bienvenida')`.
2. El tour de bienvenida tiene 5 pasos: 1 intro al centro + 4 que
   resaltan items del sidebar (productos, pedidos, branding, qr) con
   `data-tour="sidebar-*"`.
3. Tras avanzar todos los pasos (o saltar con X), el slug queda persistido
   en `localStorage['clicktoeat:tour-seen']` y no vuelve a auto-arrancar.
4. En CADA módulo, el `AdminPageHeader` con `tourSlug="..."` renderiza un
   botón "?" que abre el tour específico de ese módulo.
5. El Centro de Ayuda (`/admin/ayuda`) muestra una grilla con todas las
   cards de tour disponibles + un CTA a WhatsApp para soporte humano.

## Tours definidos (Fase 15 — 2026-06-15)

Cada tour vive en `apps/web/src/components/help/tours.ts`:

| Slug | Pasos | Auto-trigger | Usa data-tour |
|------|------:|:------------:|---------------|
| `bienvenida` | 5 | ✅ primera vez en `/admin` | `sidebar-productos`, `sidebar-pedidos`, `sidebar-branding`, `sidebar-qr` |
| `productos` | 3 | — | `productos-nuevo`, `productos-buscar` |
| `categorias` | 2 | — | `categorias-nuevo` |
| `pedidos` | 2 | — | `pedidos-filtros` |
| `inventario` | 1 | — | — |
| `compras` | 1 | — | — |
| `branding` | 3 | — | `branding-logo`, `branding-colores` |
| `qr` | 2 | — | `qr-descargar` |
| `horarios` | 1 | — | — |
| `staff` | 2 | — | `staff-nuevo` |
| `metricas` | 1 | — | — |
| `audit-log` | 1 | — | — |
| `billing` | 1 | — | — |
| `punto-venta` | 1 | — | — |

## Anatomía del TourOverlay

- **Backdrop oscuro** `rgba(11,11,15,0.62)` con `backdrop-blur(2px)` — al
  hacer click cierra el tour.
- **Highlight** del target: 4 box-shadows que crean "hole" sobre el target,
  con ring blanco 3px + sombra inferior. Sin `clip-path` para que el target
  siga siendo clickeable conceptualmente (aunque está bloqueado por overlay).
- **Tooltip** posicionado según `placement: top|bottom|left|right|center`.
  Mide el target con `getBoundingClientRect()` y re-mide en resize/scroll.
  Si el target no existe en el DOM → tooltip al centro.
- **Auto-scroll**: si el target está fuera del viewport
  (top < 80 || top > vh - 80), `scrollIntoView({ block: 'center' })`.
- **Atajos teclado**: `Esc` cierra, `→` o `space` avanza, `←` retrocede.
- **Progress dots** en el footer del tooltip (un dot por paso, el activo
  pasa de `w-1.5` a `w-6`).
- **Animación**: tooltip entra con `motion` `y:8 → 0` + `scale 0.96 → 1` en
  300ms cubic-bezier.

## Cómo agregar un tour nuevo

1. Define el slug y los pasos en `apps/web/src/components/help/tours.ts`:
   ```ts
   miModulo: [
     { title: '…', body: '…', placement: 'center', icon: '🎯' },
     { target: '[data-tour="mi-modulo-cta"]', title: '…', body: '…', placement: 'bottom' },
   ],
   ```
2. En tu página del admin, pasa `tourSlug="mi-modulo"` al `<AdminPageHeader>`.
3. Anota los elementos relevantes con `data-tour="mi-modulo-..."`.
4. Listo. El botón "?" del header y la card de `/admin/ayuda` lo encuentran.

Pasos sin `target` aparecen al centro (intro/conclusión). Si `target` no
existe en DOM (porque el módulo está vacío o el filtro lo oculta), el
paso aparece al centro como fallback.

## Centro de Ayuda

`/admin/ayuda` muestra una grilla `sm:grid-cols-2 lg:grid-cols-3` de cards
con:
- Emoji decorativo
- Título + descripción 1 línea
- Badge "Visto" si el tour ya se vio
- Footer con número de pasos + CTA "Empezar"/"Repetir"

Footer educativo abajo: card grande con CTA a WhatsApp para soporte humano
(`wa.me/52...`). Hoy apunta a un número placeholder — sustituir con el
real cuando se configure.

## Persistencia

- `localStorage['clicktoeat:tour-seen']` — `Set<slug>` de tours vistos.
- Solo se persiste el set; no se persiste el step actual ni el modal abierto.
- Si el user limpia localStorage, los tours auto-arrancan de nuevo.
- Para resetear desde devtools: `localStorage.removeItem('clicktoeat:tour-seen')`.

## Limitaciones conocidas

- Sin GIFs/videos en el Centro de Ayuda todavía — las cards solo abren el
  tour interactivo. Para agregar tutoriales en video, ampliar el componente
  y agregar URL de Cloudinary/YouTube por slug.
- El tour de bienvenida resalta items del sidebar; en mobile el sidebar
  está oculto en el drawer → los pasos con `target='[data-tour="sidebar-..."]'`
  caen al centro como fallback. UX OK pero menos didáctico.
- No hay "skip todo el tour" — el user puede cerrar con X en cualquier
  paso, lo cual lo marca como visto.

## Ver también

- [`admin-page-header.md`](admin-page-header.md) — el header reusable que
  expone `tourSlug`
- [`stores.md`](stores.md) — store `useHelpCenter`

## Bug fix 2026-06-16 — tour descentrado

**Síntoma**: el tooltip del tour aparecía descentrado en desktop (se cargaba hacia la derecha del centro) y en móvil quedaba cortado por el borde derecho del viewport.

**Causa raíz (doble)**:

1. **framer-motion sobreescribe `transform` del style inline**. El componente
   usaba `style={{ left: '50%', transform: 'translate(-50%,-50%)' }}` en el
   mismo `<motion.div>` que animaba `scale` y `y`. Framer escribe a
   `transform` propio para la animación, eliminando el `translate(-50%)`.
2. **Containing block roto por ancestors**. Aunque el TourOverlay se
   monta al nivel del root de AdminLayout, los wrappers con animaciones
   de Framer (`<RouteTransition>`, drawer móvil, etc.) crean
   `will-change: transform` que rompe `position: fixed` contra el viewport.

**Fix aplicado** (commit posterior a 0161298):

- **Portal a `document.body`** con `createPortal(...)` para evitar
  todos los ancestors con potencial transform.
- **Wrapper exterior** con `position: fixed; display: grid; place-items: center`
  que se encarga del centrado **sin transform**. El `<motion.div>` interno
  sólo controla la animación (`opacity`, `y`, `scale`).
- Cada placement (top/bottom/left/right) ahora computa un wrapper
  rectangular en un lado del target y usa `place-items` para alinear,
  evitando otra vez el problema del transform sobre-escrito.
- `pointer-events: none` en el wrapper + `pointer-events-auto` en el
  `<motion.div>` interno para que el backdrop siga siendo clickeable
  fuera del tooltip.

**Lección**: cuando uses framer-motion con `position: fixed` centrado,
**nunca** mezcles `transform: translate(-50%)` con la animación —
separa el centrado a un wrapper exterior.
