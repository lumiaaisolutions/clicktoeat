# Frontend — Landing pública del local

`apps/web/src/app/[slug]/page.tsx` + `LandingClient.tsx`.

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
