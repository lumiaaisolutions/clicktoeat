# Frontend — Overview

`apps/web/` — Next.js 14 App Router + TypeScript estricto + Tailwind 3 + Zustand 4.

## Caras del frontend

### Pública
- **Directorio** (`/`): home / lista de locales activos. Server Component que renderiza `DirectoryClient`. Ver [`directorio-publico.md`](./directorio-publico.md).
- **Landing por local** (`/[slug]`): menú, carrito, captura de pedido, botón WhatsApp. Ver [`landing.md`](./landing.md).

### Privada
- **Login** (`/login`).
- **Panel admin** (`/admin/*`): branding, productos, categorías, inventario, recetas, compras, métricas, horarios, QR, POS, perfil, locales (super_admin). Ver [`admin.md`](./admin.md).

## Subsistemas transversales (todos documentados aparte)

| Tema | Documento |
|------|-----------|
| Secciones modulares de la home | [`landing-sections.md`](./landing-sections.md) |
| Patrones de animación scroll | [`scroll-animations.md`](./scroll-animations.md) |
| Sistema de loaders (Initial / Route / RSC) | [`loaders.md`](./loaders.md) |
| Iconos inline estilo Lucide | [`icon-system.md`](./icon-system.md) |
| Geolocalización ("Cerca de ti") | [`geolocation.md`](./geolocation.md) |
| Routing / structure | [`routing.md`](./routing.md) |
| Stores (Zustand) | [`stores.md`](./stores.md) |
| Componentes UI compartidos | [`components.md`](./components.md) |

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
│   ├── layout.tsx          # root: fuentes, metadata, InitialLoader, RouteTransition
│   ├── loading.tsx         # Suspense fallback del root segment
│   ├── page.tsx            # directorio público (RSC)
│   ├── DirectoryClient.tsx # cliente del directorio (orquestador de secciones)
│   ├── [slug]/             # landing del local
│   │   └── loading.tsx     # Suspense fallback del slug
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   └── admin/              # panel del owner (todas las páginas)
│       ├── layout.tsx      # sidebar + notificaciones bell + guard
│       ├── loading.tsx     # Suspense fallback compact
│       └── */page.tsx
├── components/
│   ├── ui/                 # Button, Modal, FormField, Logo, Icon, BrandLoader, etc.
│   ├── landing/            # ScrollPhoneSequence, WhyClickToEatSection, SystemPreviewSection
│   └── admin/              # ImageUpload, LeafletMap, LocationPicker, NotificacionesBell
├── store/                  # Zustand: auth, cart, notificaciones, toast
└── lib/
    ├── api.ts              # axios + tokenStore + fetchMenu (RSC fetcher)
    ├── types.ts            # interfaces compartidas
    ├── utils.ts            # cn(), formatMXN()
    ├── echo.ts             # stub Pusher/Echo (pre-implementación broadcasting)
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
