# Frontend — Landing pública del local

`apps/web/src/app/[slug]/page.tsx` (SSR) + `LandingClient.tsx` (cliente).

> Última actualización: 2026-06-14 — rediseño editorial cálido. Ver entrada
> en `CHANGELOG.md` "Changed — Landing del local: rediseño editorial cálido".

## Look & feel

Inspirado en el patrón "menú digital cálido de restaurante" (cream warm bg
+ serif display + cards lift + cart FAB con sheen+ring). Toda la
identidad cromática viene de `branding.*` del local: el cliente la
configura desde `/admin/branding` y la landing la refleja en CSS vars en
caliente — **ningún dato del template es hardcodeado**.

Tipografías (cargadas en `apps/web/src/app/layout.tsx` desde Google Fonts):

- **Instrument Serif** (`.ce-serif`) — display editorial: nombre del local
  en hero, título de categoría, resumen del checkout, footer.
- **Hanken Grotesk** (`.ce-body`) — UI/body en cards de producto y cart.
- **Bricolage Grotesque** (`.ce-display`) — heredada del directorio público;
  no se usa en este landing salvo overlays globales.
- **Geist** (default `font-sans`) — fallback general del proyecto.

Ver [`typography.md`](typography.md) para reglas de cuándo usar cada una.

## Estructura general

```
LandingClient
├── Hero (76vh) — banner + overlay + top bar glass + tagline + nombre serif + chevron bob
├── Info card flotante (-mt-70) — status pulse dot + horario + ubicación
├── Banner CERRADO (sólo si estado.abierto === false, debajo del card)
├── Sticky bar de categorías — chips horizontales scroll-x con icono editable
├── Section productos — grid auto-fill 260px con product cards
├── Footer dark — identidad + contacto + redes + LUMIA credit
├── ProductDetailSheet — bottom sheet con cantidad + Añadir
├── CartFab — FAB con sheen + ring pulse + count badge pop
├── CartDrawer — panel derecha
└── CheckoutSheet — bottom sheet con resumen + form + WhatsApp button verde
```

## Hero

- Altura: `clamp(440px, 76vh, 660px)`.
- Imagen `branding.banner` con `scale(1.08)→1` en mount (1.6s).
- Overlay gradient 4-stops oscuro (top:.30 / .05 / .20 / bottom:.74) para
  legibilidad en cualquier banner.
- Top bar:
  - Izquierda: avatar 46×46 — si hay `branding.logo` se usa, si no muestra
    la inicial del `local.nombre` sobre fondo glass `rgba(255,255,255,.16)`
    con backdrop-blur 14px.
  - Derecha: botón theme toggle (sol/luna). Alterna `dark` local del
    componente — **no persiste**, solo alterna mientras el visitante está
    en la página. El `branding.darkMode` del owner define el estado inicial.
- Texto centrado abajo (`bottom:118px`):
  - Tagline en uppercase, `letter-spacing:.32em`, `opacity:.86`.
  - Nombre en Instrument Serif `clamp(46px, 9vw, 84px)` `line-height:.98`.
- Scroll hint: chevron-down con animación `ce-bob` 2.4s infinite.

## Info card flotante

- `margin-top:-70px` para superponer hero, `z-index:8`.
- `max-width:640px`, `border-radius:24px`, sombra grande
  `0 24px 60px -20px rgba(35,25,15,.28)`.
- Tres celdas separadas por divisores verticales (ocultos en mobile):
  1. **Status dot** con animación `ce-pulse-dot` 2.4s:
     - Verde `#2DA05A` + label "Abierto" si `estado.abierto === true`.
     - Rojo `#DC2626` + "Cerrado" si `estado.abierto === false`.
     - Gris `#A89C90` + "Sin horario" si `null`.
  2. **Horario** (icon `clock` accent) — generado por `formatHorarios()` que
     condensa los 7 días si todos comparten el mismo horario
     (`"Lun – Dom · 9:00 – 22:00"`) o lista días con horario común.
  3. **Ubicación** (icon `map-pin` accent) — `local.direccion`.

## Banner CERRADO

Cuando `estado.abierto === false`, **además** del status dot rojo en el
info card, se renderiza un banner cálido debajo:

- Fondo `bg-red-50` con barra accent vertical roja a la izquierda.
- Icon `clock` rojo con halo `animate-ping`.
- Texto Instrument Serif "Volvemos pronto" + mensaje del backend limpiado
  (regex elimina prefijo redundante `"Cerrado · "`).
- Badge `CERRADO` derecha con dot `halo-pulse` blanco.

## Categorías — chips scroll-x

Reemplazaron al "CategoryButton con icono volando" de la versión anterior.

- Sticky top (`top:0`, `z-30`), fondo glass `rgba(251,248,243,.82)` (o
  `rgba(22,17,13,.82)` en dark) con backdrop-blur 20px.
- Flex horizontal scrollable (`ce-chips-scroll` oculta scrollbar).
- Cada chip:
  - Inactivo: `bg-surface` + border-line, hover `-translate-y-0.5`.
  - Activo: gradient diagonal `var(--ce-accent)` → mezcla 78% accent +
    22% black, texto blanco, sombra `0 8px 22px -8px rgba(0,0,0,.32)`.
- Icon a la izquierda del texto, size 13, strokeWidth 2.4. Viene de
  `categoria.icono` (editable desde `/admin/categorias`) o de
  `iconForCategoria()` cuando es `null`.

### `iconForCategoria()` — inferencia automática

Helper en `LandingClient.tsx`. Mira el nombre y mapea a un icono del set
de ~50 (Icon system) cubriendo 50+ keywords en español:

| Familia | Keywords (ej) | Icono fallback |
|---|---|---|
| Postres | `pastel`, `cake`, `helado`, `paleta` | `cake`, `ice-cream`, `popsicle` |
| Bebidas | `café`, `vino`, `cerveza`, `coctel` | `coffee`, `wine`, `beer`, `martini-glass` |
| Comida | `pizza`, `burger`, `sopa`, `carne` | `pizza`, `sandwich`, `soup`, `beef` |
| Conceptos | `vegano`, `picante`, `desayuno`, `combo` | `sprout`, `flame`, `sun`, `gift` |

Fallback final: `utensils`. Si el owner asignó `categoria.icono` en BD se
respeta ese.

## Productos — grid de cards

Tras la sesión 2026-06-14 se sustituyó el accordion expansible por un
**grid de cards** estilo "menú clásico de restaurante" — la decisión es
volver a un patrón que el comensal lee de un vistazo sin tener que
expandir paneles.

- `grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr))`.
- Gap `clamp(14px, 2.4vw, 22px)`.
- Animación `ce-fade-swap` al cambiar de categoría (`key={activeCat}`).

Cada card:

- `border-radius:22px`, sombra `0 10px 30px -12px rgba(35,25,15,.18)`.
- Imagen `aspect-ratio:16/11` con clase `.ce-pimg` (hover → `scale(1.07)`
  en 600ms `cubic-bezier(.22,.61,.36,1)`).
- Hover en card: `translateY(-6px)` + sombra más profunda (`.ce-card`).
- Tag (`producto.tag`): pill superior izquierda con `var(--ce-accent)`.
- Título Hanken bold 16.5px.
- Descripción 2 líneas con `-webkit-line-clamp:2`.
- Precio Hanken extrabold 18px en color del accent.
- Botón `+` 44×44 con gradient + sombra del accent — click NO abre el
  detail; agrega directo al carrito (1 unidad) y abre el cart drawer.
- Click en el cuerpo de la card abre el `ProductDetailSheet` (modal).

## ProductDetailSheet

- Bottom sheet (mobile) / centered modal (sm+) con animación
  spring (`detailIn` semantically): `y:40→0` con `stiffness:320, damping:32`.
- Backdrop oscuro `rgba(20,12,6,.5)` con backdrop-blur 6px.
- Imagen 16/10 + botón X arriba (gira 90° en hover) + tag.
- Título Instrument Serif 30px, descripción 14.5px.
- Selector cantidad (`-` qty `+`) en pill con border-line.
- Botón "Añadir · $XX" gradient ce-accent → 72% accent + 28% black.

## CartFab

- Posición `fixed bottom-right`, respeta safe-area.
- Pill 64px alto con dos zonas:
  - Círculo con icon `utensils` + count badge blanco arriba-derecha con
    animación `ce-pop` al cambiar (key={count}).
  - Texto "MI PEDIDO" (uppercase letterspaced) + total grande.
- Tres efectos overlay:
  - `ce-cart-ring` — borde 2px del accent que escala 0.9→1.32 y se
    desvanece cada 2.8s.
  - `ce-sheen` — gradient blanco diagonal recorriendo de izq a der cada
    4.5s (`skewX(-18deg)`).
  - Hover: `-translate-y-3px` + brightness 1.10.

## CartDrawer

- Panel derecho `min(440px, 92vw)` con animación `x:'100%'→0` (400ms,
  cubic-bezier panel-in).
- Header: "TU PEDIDO" uppercase accent + count Instrument Serif + botón X
  (rota 90° hover).
- Lista de items con animación `ce-row-in` stagger (delay = idx × 0.05s).
- Cada item: imagen 60×60 + nombre + total línea + control qty.
- Footer: total Hanken extrabold + botón "Confirmar pedido →" gradient
  accent. Si `cerrado` el botón se grisea y muestra warning.

## CheckoutSheet

Bottom sheet (mobile) / modal centered (sm+) con fondo `#FBF8F3`.

- Botón volver ← (translate-x-0.5 hover) + "Último paso" uppercase accent
  + "Confirma tu pedido" Instrument Serif 30px.
- **Resumen**: card con border-line, cada line item `Nº× nombre … total`,
  línea de envío si delivery, total grande tabular-nums.
- **Form** vertical:
  - Tu nombre
  - Tipo de entrega: toggle 2 botones (`delivery` con icon `truck` y
    `pickup` con icon `storefront`). El activo tiene gradient accent.
  - Si `delivery`: `DeliveryAddressInput` con Nominatim autocomplete +
    LeafletMap + botón "Usar mi ubicación aproximada" + indicador de
    distancia / fuera de rango.
  - Teléfono.
  - Método de pago `<select>` con `local.metodosPago`.
- Botón final: alto 58px, gradient WhatsApp `#25D366`, icon `whatsapp`,
  sombra verde profunda. Se desactiva si `sending`, `cerrado`,
  `!nombre`, `!telefono`, o `delivery && (!direccion || fueraDeRango)`.

> **Nota:** el HTML de referencia incluía un campo "Notas (opcional)"
> general del pedido. **No está en producción** porque nuestro backend
> acepta `notas` por item de carrito, no global, y no quisimos engañar al
> usuario con un campo que se pierde. Cuando se implemente notas globales
> en `pedidos`, agregar el input en `CheckoutSheet` y mandar a
> `payload.notas`.

## Flujo de pedido (sin cambios funcionales)

```
GET /tacos-el-gordo
   ▼
page.tsx (SSR) → fetchMenu(slug) → 404 NotFoundError → not-found.tsx
   ▼
<LandingClient data={...} />
   ├── Setea CSS vars: --ce-accent ← branding.colorPrimario
   ├── Renderiza hero + info card + categorías + productos
   ├── useCart(): setLocal(slug) → purga si era otro local
   ▼
Click producto → ProductDetailSheet → onAdd(qty) → cart.add()
   ▼
CartDrawer → "Confirmar pedido" → CheckoutSheet
   ▼
POST /api/v1/public/pedidos/{slug}
   ├── 409 stock insuficiente → mostrar faltantes
   ├── 422 validación → mostrar mensaje
   └── ok → window.open(whatsapp_url) + cart.clear()
```

## CSS vars de branding

`LandingClient` inyecta en root:
```css
--ce-accent: <branding.colorPrimario>;
background:  <branding.colorFondo || '#FBF8F3'>;
color:       var(--ce-ink);
```

`.ce-dark` se aplica si el theme toggle local lo activa o si
`branding.darkMode` es true al inicio.

Tailwind `tailwind.config.ts` mapea `accent`, `ink`, `bg`, `line`, `muted`,
`surface` a las vars `--ce-*`, así que `bg-accent` / `text-ink` rinden
con el color del local automáticamente.

## Carrito

Store `useCart` (ver [`stores.md`](stores.md#cart-storecartts)). Sin cambios.
- `lineKey` único por (producto + hash extras + notas).
- `setLocal(slug)` purga al cambiar de local.
- Persiste en localStorage.

## Validaciones cliente

- `!nombre || !telefono` → submit deshabilitado.
- `delivery && (!direccion || fueraDeRango)` → submit deshabilitado.
- Backend valida igual (Form Requests).

## Errores

- 409 stock → lista `faltantes`.
- 422 → `body.message`.
- Fallback de red: `buildWhatsAppUrl()` local — abre WhatsApp aunque la
  API esté caída.

## Estado abierto/cerrado

Calculado server-side y serializado como `data.local.estado: { abierto, mensaje }`.
Cliente sólo refleja. Hidratación segura — no se vuelve a calcular en
cliente para evitar mismatch.

## Animaciones (clases CSS)

Definidas en `globals.css` (sección "Landing del local — editorial / restaurante"):

| Clase | Uso | Origen |
|---|---|---|
| `.ce-pop` | Count badge del cart FAB al cambiar | `@keyframes ce-pop` 450ms |
| `.ce-bob` | Chevron scroll hint del hero | infinite 2.4s |
| `.ce-pulse-dot` | Status dot del info card | infinite 2.4s, color custom via `--ce-dot-glow` |
| `.ce-fade-swap` | Grid al cambiar de categoría | 500ms |
| `.ce-sheen` | Reflejo recorriendo el cart FAB | infinite 4.5s |
| `.ce-cart-ring` | Ring expandiéndose en cart FAB | infinite 2.8s |
| `.ce-row-in` | Items del cart al aparecer (stagger) | 420ms |
| `.ce-pimg` + `.ce-card` | Hover scale + lift en product cards | 600ms / 350ms |

Animaciones de motion (framer-motion) se usan en sheets (`spring`),
banner cerrado (`y:-8→0`), hero img (`scale 1.08→1`) y CartDrawer
(`x:100%→0`). Ver el componente para detalles.

## Performance

- Bundle de `/[slug]`: **16.8 kB** (antes ~31 kB con accordion).
- Imágenes `<img>` plano (no `next/image`) — vienen de uploads dinámicos.
- `cache: 'no-store'` en `fetchMenu` → siempre fresco.
- Fuentes: 4 familias cargadas en `layout.tsx` con `&display=swap`.

## Footer

Dark restaurante premium. Sin cambios sustanciales tras el rediseño:

```
┌─ accent line top (gradient transparent → var(--ce-accent) → transparent) ─┐
│                                                                            │
│  [Logo]   Nombre del local            CONTACTO         SÍGUENOS           │
│           tagline                     📍 dirección     [IG][FB][WA]      │
│                                       📞 teléfono                          │
│                                       🕐 horario                           │
│                                                                            │
│  ─────────────────────────────────────────────────                       │
│  © 2026 Local. Todos los derechos reservados.   Desarrollado por LUMIA   │
└────────────────────────────────────────────────────────────────────────────┘
```

- Identidad: logo 44×44 + nombre Instrument Serif 30px + tagline.
- Contacto: dirección, teléfono o WhatsApp, horario.
- Redes: pills circulares 42×42 con border `white/20`. Hover cambia
  background a `var(--ce-accent)` y `-translate-y-3px`.
- Bottom bar: copyright + "Desarrollado por LUMIA" con underline accent.

## Pendientes / mejoras conocidas

- Persistir el theme toggle del visitante en `localStorage`.
- Renderizar variantes de producto (extras) en el `ProductDetailSheet` —
  hoy se ignora `producto.extras` y siempre se agrega sin extras seleccionados.
  Es relevante cuando un local activa el módulo de extras/recetas.
- Notas globales del pedido (ver nota en CheckoutSheet) — requiere backend.
- SEO: `generateMetadata({ params })` para `<title>` dinámico.
- OG image dinámica.
- Partir `LandingClient.tsx` (~30 KB) en sub-componentes
  (Hero, InfoCard, Categorias, ProductGrid, etc.).
- PWA + offline (Fase 5).

## Ver también

- [`typography.md`](typography.md) — fuentes y reglas de uso
- [`icon-system.md`](icon-system.md) — el componente `<Icon>` y `IconPicker`
- [`stores.md`](stores.md#cart-storecartts) — Zustand `useCart`
- [`scroll-animations.md`](scroll-animations.md) — patrones de la home
- [`../features/whatsapp.md`](../features/whatsapp.md) — formato del mensaje
- [`../features/branding.md`](../features/branding.md) — qué edita el owner
