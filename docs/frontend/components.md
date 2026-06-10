# Frontend — Componentes

## UI primitivos — `components/ui/`

### `Button.tsx`
Botón estilizado con variants (primary/ghost). Acepta `loading`, `disabled`. Estilo via Tailwind + CSS vars.

### `FormField.tsx`
Wrapper de input con label + error + helper text. Usado en todos los forms admin.

### `Modal.tsx`
Modal accesible con backdrop blur, animación de entrada (framer-motion). `open`/`onClose`. Renderiza children en portal.

### `Skeleton.tsx`
Placeholder gris con shimmer. Para listas y cards mientras cargan datos.

### `Toaster.tsx`
Renderea los toasts del store `toast`. Stack vertical en esquina inferior. Self-dismissing en 4s.

### `Logo.tsx`
Logo SVG de ClickToEat. Variantes: `lockup` (con texto), `mark` (sólo símbolo). Size configurable.

### `QRCode.tsx`
Wrapper de `qrcode` (npm). Recibe URL + opciones de color y tamaño. Renderiza como `<canvas>` o `<img>`.

---

## Componentes de admin — `components/admin/`

### `ImageUpload.tsx`
File picker + preview + auto-upload a `/uploads/image`. Devuelve `{ url, public_id }` al padre vía callback. Muestra progreso y errores. Reset al éxito.

### `LeafletMap.tsx`
Mapa Leaflet con marker. Configurable: zoom, center, draggable marker. Acepta callback `onChange(lat, lng)`. Usado por `LocationPicker`.

### `LocationPicker.tsx`
Compuesto de `LeafletMap` + buscador (geocoding manual o address text). Permite al owner seleccionar coords del local. Persiste el value como lat/lng numéricos.

### `NotificacionesBell.tsx`
Campanita con contador `noLeidas`. Dropdown con la lista (`Notificacion[]`) + sección separada para `pedidosNuevos`. Hace `marcarLeida` al hacer click. Conectado al store `notificaciones`.

---

## Componentes de página

Algunos páginas exportan sus propios sub-componentes inline (no en `components/`) por estar fuertemente acoplados a la página:

- `app/DirectoryClient.tsx` — cards del directorio + filtros.
- `app/[slug]/LandingClient.tsx` — menú entero + carrito + checkout (~31 KB de TSX). Candidato a partir en sub-componentes (pendiente refactor).

## Convenciones

- **Props tipadas** con interfaces locales (no `React.FC<Props>` — desuso de React 18+).
- **Server Components** sin imports de `react` para hooks de cliente.
- **`'use client'`** la línea 1 cuando aplica.
- **Estilos** con Tailwind + `cn(...)` helper (`lib/utils.ts`) para condicionales.
- **Animaciones** con `motion.div` / `AnimatePresence` (framer-motion).
- **Accesibilidad**: inputs con `<label>`, modales con focus trap, botones con `disabled` real.

## Lo que no existe (pendiente)

- DataTable reutilizable (cada página tiene su propia tabla).
- Pagination component (cada página lleva su lógica de meta).
- Date picker (los rangos de fecha usan `<input type="date">` nativo).
- Toast con tipo `warning` (sólo success/error/info).
- Loading boundaries con `<Suspense>` — hoy se hace con flag `loading` en cada page.
