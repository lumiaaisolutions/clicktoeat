# Frontend — Overview

`apps/web/` — Next.js 14 App Router + TypeScript estricto + Tailwind 3 + Zustand 4.

## Caras del frontend

### Pública
- **Directorio** (`/`): lista de locales activos. Server Component.
- **Landing por local** (`/[slug]`): menú, carrito, captura de pedido, botón WhatsApp.

### Privada
- **Login** (`/login`).
- **Panel admin** (`/admin/*`): branding, productos, categorías, inventario, recetas, compras, métricas, horarios, QR, POS, perfil, locales (super_admin).

## Stack

- **Next.js 14 App Router** — RSC + cliente. `dynamic = 'force-dynamic'` en páginas que dependen de datos vivos.
- **TypeScript estricto** (`strict: true` en tsconfig).
- **Tailwind 3** con CSS vars para colores → el branding del local sobrescribe `--ce-accent`, `--ce-bg`, `--ce-ink`, etc.
- **Zustand** para estado cliente: auth, cart, toasts, notificaciones.
- **Axios** con interceptors para token y 401.
- **Framer Motion** para animaciones de landing y modales.
- **Leaflet + react-leaflet** para el picker de ubicación.
- **`qrcode`** para el QR del menú.

## Estructura `src/`

```
src/
├── app/                    # rutas (App Router)
│   ├── layout.tsx          # root: fuentes, metadata
│   ├── page.tsx            # directorio público (RSC)
│   ├── DirectoryClient.tsx # cliente del directorio
│   ├── [slug]/             # landing del local
│   ├── login/
│   └── admin/              # panel del owner (todas las páginas)
│       ├── layout.tsx      # sidebar + notificaciones bell + guard
│       └── */page.tsx
├── components/
│   ├── ui/                 # Button, Modal, FormField, Logo, QRCode, ...
│   └── admin/              # ImageUpload, LeafletMap, LocationPicker, NotificacionesBell
├── store/                  # Zustand: auth, cart, notificaciones, toast
└── lib/
    ├── api.ts              # axios + tokenStore + fetchMenu (RSC fetcher)
    ├── types.ts            # interfaces compartidas
    ├── utils.ts            # cn(), formatMXN()
    └── whatsapp.ts         # buildWhatsAppUrl (espejo del builder PHP)
```

## Convenciones

- **Path alias** `@/*` → `src/*`.
- **`'use client'`** sólo cuando hace falta (forms, stores, animaciones, mapas).
- **Datos para landing/menu**: `fetch` con `cache: 'no-store'` para reflejar cambios del owner inmediatamente (no ISR).
- **Estado del local** (abierto/cerrado): viene **calculado del backend**, no se recalcula en cliente. Razón: evita hydration mismatch con `new Date()`.
- **Carrito**: persiste en `localStorage` (`clickeat:cart`). Se purga al cambiar de tenant (`setLocal(slug)` distinto al guardado).
- **Auth**: token en `localStorage` (`clickeat:token`). User en zustand persisted.
- **Toasts**: `toast.success/error/info` global, sin context provider necesario.

## Variables de entorno

`apps/web/.env.local` (no commiteado real, hay `.env.local` y `.env.production` en disco):

| Variable                       | Para qué                                |
|-------------------------------|-----------------------------------------|
| `NEXT_PUBLIC_API_URL`          | Base URL de la API Laravel               |
| `NEXT_PUBLIC_APP_URL`          | URL pública del Next (para QR, OG, etc.) |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`  | Declarado pero el mapa usa Leaflet — pendiente limpiar |

## Build

```
npm install
npm run dev        # next dev en 0.0.0.0:3000 (para LAN)
npm run build      # standalone build
npm run start      # next start (production)
npm run lint
npm run typecheck
```

## Server custom

`apps/web/server.js` — servidor Node mínimo que invoca `next` programáticamente. No se usa en dev. Util para producción si no se levanta con `next start` directamente.

## Headers extras

`next.config.mjs`:
- `poweredByHeader: false`
- `images.remotePatterns`: permite imágenes desde `images.unsplash.com` y el dominio API prod (`clicktoeat-api.lumiaaisolutions.com`).
