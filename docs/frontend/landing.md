# Frontend — Landing pública del local

`apps/web/src/app/[slug]/page.tsx` + `LandingClient.tsx`.

## Estructura general (junio 2026)

```
LandingClient
├── Hero con banner background + logo + nombre + pill abierto/cerrado
├── Banner "Volvemos pronto" (sticky top, solo si cerrado)
├── Tabs de categorías (CategoryButton) — gradient accent + icono flotante
├── Accordion de productos (ProductAccordion + AccordionPanel)
├── Footer dark — info local + redes 3D + "Desarrollado por LUMIA"
├── FloatingCartBar (fixed bottom)
├── CartDrawer (slide-in)
├── CheckoutSheet (modal)
```

## Banner CERRADO — estilo restaurante premium

Cuando el local NO acepta pedidos (`estado.abierto === false`), se renderiza
un banner sticky-top con:
- Línea **vertical roja gradient** a la izquierda (sello de menú físico).
- Icon clock con **halo ping** rojo expandiéndose.
- Tipografía display: **"Volvemos pronto"** (cálido, no app-ish).
- Mensaje secundario limpio (regex elimina el "Cerrado · Cerrado · …" duplicado).
- Badge **CERRADO** a la derecha (oculto en mobile estrecho) con dot halo-pulse.

## Tabs de categorías (CategoryButton)

Botones rediseñados estilo "Contact button" premium con icono **flotante grande**:

- **Centrados** horizontalmente con `flex-wrap justify-center gap-5/7`.
- **Activo**: gradient diagonal `var(--ce-accent)` → mezcla 70% accent + 30% black.
  Shadow profunda. Hover lift `-translate-y-0.5` + shadow más grande.
- **Inactivo**: `bg-surface` + border-line. Mismo hover lift.
- **Icono SIN background, size 56, strokeWidth 2.5**, posición absolute
  derecha con `translate-x-4 sm:6` (sale del botón).
- **Truco "sticker"**: filter `drop-shadow blanco x3` (contorno) + `drop-shadow oscuro` (profundidad).
  Funciona sobre cualquier color de fondo del local — el contorno blanco
  hace que el icono ink sea siempre legible.
- **Rotación 10° base** → 18° + scale-110 + translate-x extra en hover.
- Color del accent siempre viene de `var(--ce-accent)` — lo configura el owner.

### iconForCategoria() — inferencia automática

Función helper en `LandingClient.tsx` que mira el nombre de la categoría
y mapea a un icono representativo del catálogo de 31 (Icon system).
Cubre 50+ keywords en español por familia:

| Familia | Keywords (ej) | Icono |
|---|---|---|
| Postres | `pastel`, `cake`, `helado`, `paleta`, `fruta` | `cake`, `ice-cream`, `popsicle`, `cherry`, `apple` |
| Bebidas | `café`, `vino`, `cerveza`, `coctel`, `refresco`, `leche` | `coffee`, `wine`, `beer`, `martini-glass`, `cup-soda`, `milk` |
| Comida | `pizza`, `burger`, `sopa`, `carne`, `pollo`, `pescado`, `huevo`, `pan`, `snack` | `pizza`, `sandwich`, `soup`, `beef`, `drumstick`, `fish`, `egg`, `croissant`, `popcorn` |
| Conceptos | `vegano`, `gluten`, `picante`, `desayuno`, `cena`, `combo` | `sprout`, `wheat`, `flame`, `sun`, `moon`, `gift` |

Fallback: `utensils`. Si la categoría tiene `icono` en BD, se usa ese.

## Productos — Accordion expansible (junio 2026)

El grid clásico de cards fue reemplazado por un **accordion estilo paneles**
(inspirado en el patrón Traversy):

- **Estado inicial**: todos los productos colapsados (flex 0.5 / altura mínima).
- **Click en un panel** → se expande (flex 5), el resto vuelve a compacto.
- **Panel expandido** muestra inline: título grande, descripción, selector
  +/- de cantidad y botón "Agregar · $XX" (total dinámico).
- **Panel colapsado** muestra: imagen de fondo + título (vertical en desktop,
  horizontal en mobile) + precio sutil arriba a la derecha.
- **Tag POPULAR** siempre visible arriba a la izquierda si el producto lo tiene.

### Responsive

| Breakpoint | Comportamiento |
|------------|----------------|
| `md+` | Flex horizontal — paneles a lo ancho, expansión lateral |
| `<md` | Flex vertical — paneles apilados, expansión hacia abajo (altura 120px → 480px) |

### UX justificación

- 1 tap para ver detalle Y agregar → más rápido que tap → modal → cantidad → agregar.
- El precio sutil cuando colapsado evita saturar visual; cuando expandido, el total
  vive en el botón "Agregar · $XX".
- La X de cerrar solo aparece cuando hay panel activo, en la esquina superior derecha.
- Tras "Agregar" el panel se colapsa automáticamente y se abre el cart drawer.

### Por qué no modal aparte

Antes había un `ProductPreview` modal. Tradeoffs:

| | Modal aparte | Accordion inline |
|---|---|---|
| Taps para agregar 1 producto | 3 | 1-2 |
| Mobile UX | Bottom sheet ok | Más natural — sin overlay |
| Vista del menú completo | Se oculta | Se mantiene como contexto |
| Animación | Slide-up de modal | Expansion lateral / vertical |

El accordion gana en velocidad y en mantener el menú visible. El componente
`ProductPreview` legacy queda en el archivo pero ya no se monta.

## Flujo

```
GET /tacos-el-gordo
   │
   ▼
app/[slug]/page.tsx (Server Component)
   ├── fetchMenu(slug)                       // lib/api.ts
   │     ├── fetch /public/menu/{slug} (cache: 'no-store')
   │     └── 404 → throw MenuNotFoundError → not-found.tsx
   └── return <LandingClient data={...} />
   ▼
LandingClient (Client)
   ├── Setea CSS vars de branding en root
   ├── Renderiza hero + sticky bar de categorías
   ├── Renderiza grilla de productos por categoría
   ├── Sheet de carrito (controlado por useCart)
   ├── Checkout flow: form → POST /public/pedidos/{slug} → abre wa.me
```

## Estructura del menú renderizado

1. **Hero**: logo, nombre, tagline, badge de estado ("Abierto · cierra a las 23:00"), redes sociales.
2. **Sticky nav** con tabs por categoría (scroll-spy).
3. **Producto card**: imagen, nombre, descripción, precio (con descuento si aplica), tag, botón "Agregar".
4. **Modal de producto** al hacer click: selector de extras (radio/checkbox según `kind`), notas, cantidad. Acumula `precio_unitario`.
5. **Carrito side-sheet**: lista de items, edición de cantidades, subtotal + entrega + total.
6. **Checkout**: campos de cliente, método de entrega, método de pago. Si delivery → captura dirección (+ opcional lat/lng del navegador).
7. **POST** → respuesta con `whatsapp_url` → `window.open(url)` → carrito se limpia.

## CSS vars de branding

`LandingClient` inyecta:
```css
:root {
  --ce-accent: <color_primario>;
  --ce-ink:    <color_secundario>;
  --ce-bg:     <color_fondo>;
  /* (otros derivados como --ce-line, --ce-surface ya están en globals.css) */
}
```

Tailwind tiene mapeo en `tailwind.config.ts`:
```ts
colors: {
  ink: 'var(--ce-ink, #0B0B0F)',
  bg:  'var(--ce-bg,  #FAFAF7)',
  accent: 'var(--ce-accent, #FF2D2D)',
  ...
}
```

→ usar `bg-accent` / `text-ink` aplica los colores del local al instante.

## Carrito

Store `useCart` (ver [`frontend/stores.md`](stores.md#cart-storecartts)).

- `lineKey` único por (producto + hash de extras + notas) — permite añadir el mismo producto con dos configuraciones distintas como líneas separadas.
- Al entrar a una landing nueva, `setLocal(slug)` purga si era de otro local.
- Sobrevive recarga (localStorage).

## Validaciones cliente

Antes de pegar al backend:
- Cliente nombre + teléfono requeridos.
- Si delivery → dirección requerida.
- Items > 0.

El backend valida igual; el cliente sólo evita roundtrips obvios.

## Botón WhatsApp

El backend devuelve `whatsapp_url` ya armada. Frontend hace `window.open(whatsappUrl, '_blank')`. Si por alguna razón no viene, hace fallback a `buildWhatsAppUrl(...)` local (espejo del builder PHP — ver [`features/whatsapp.md`](../features/whatsapp.md)).

## Errores

- 409 stock insuficiente → mensaje con la lista de `faltantes`.
- 409 cerrado → mensaje "El local no está aceptando pedidos ahora" + horario sugerido.
- 422 fuera de radio → mensaje con la distancia.
- 422 validación → muestra `errors` en los campos.

Todo via `toast.error(...)` + estado del form.

## Estado abierto / cerrado

Viene en `data.local.estado` calculado server-side. Frontend sólo renderiza el `mensaje` y eventualmente deshabilita el checkout (`abierto !== true`).

Por qué server-side: usar `new Date()` en cliente causaba hydration mismatch en Next 14 cuando el servidor y el cliente arrancaban en milisegundos distintos.

## Performance

- `cache: 'no-store'` significa "siempre fresco". El backend es rápido (~50ms con MySQL local).
- Imágenes son `<img>` plano (no `next/image`) en `LandingClient` porque vienen de uploads dinámicos sin pre-procesado.
- Producción: nginx sirve archivos estáticos con `expires 7d` para fuentes/css/js (ver `docker/nginx/default.conf`).

## Pendiente

- Partir `LandingClient.tsx` (~31 KB) en sub-componentes (Hero, MenuList, ProductModal, CartSheet, Checkout).
- SEO: `generateMetadata({ params })` para producir `<title>` específico del local.
- OG image dinámica.
- Skeleton durante el fetch inicial (hoy es 100% SSR, no aplica).
- PWA + service worker para que la landing funcione offline (fase 5).

## Footer — restaurante premium dark

Estructura final del footer del local (al fondo de la landing):

```
┌─ accent line top (gradient transparent → var(--ce-accent) → transparent) ─┐
│                                                                            │
│  [Logo local]   Nombre del local              SÍGUENOS                    │
│                 tagline                                                    │
│                 📍 dirección                  [FB 3D] [IG 3D] [TT 3D]    │
│                 📱 +WhatsApp                                              │
│                                                                            │
│  ─────────────────────────────────────────────────                       │
│  © 2026 Local. Todos los derechos reservados.   Desarrollado por LUMIA ↗ │
└────────────────────────────────────────────────────────────────────────────┘
```

Características:

- **bg-ink** (negro) full-width — contraste premium estilo restaurante.
- **Orb gradient** decorativo del color del local arriba a la derecha (opacity 20%).
- **Línea accent superior** horizontal (gradient transparent → ce-accent → transparent).
- **Grid 2 cols** en md+: identidad + redes. Stack en mobile.
- **Identidad**: logo (12×12 con border-white/20) + nombre display + tagline +
  dirección con icon map-pin + WhatsApp clickeable con icon verde.
- **Redes 3D**: tarjetas isométricas con color real de cada red (Facebook
  blue, Instagram gradient pink-purple oficial, TikTok black).
- **Bottom bar** separado con border-t white/10:
  - Copyright: `© YEAR {nombre local}. Todos los derechos reservados.`
  - **"Desarrollado por LUMIA ↗"** → link a https://lumiaaisolutions.com
  - "LUMIA" tiene gradient effect on hover (from ce-accent → white).

El status card "Cerrado por ahora" del footer **fue eliminado** (junio 2026) —
ya existe el banner top sticky y el bottom redundancia.
