# Frontend — Rutas y páginas

App Router de Next.js 14. Cada carpeta dentro de `src/app/` representa un segmento.

## Mapa de rutas

| URL                              | Tipo                | Archivo                                              |
|---------------------------------|---------------------|------------------------------------------------------|
| `/`                              | RSC + cliente        | `app/page.tsx` + `app/DirectoryClient.tsx`            |
| `/[slug]`                        | RSC + cliente        | `app/[slug]/page.tsx` + `LandingClient.tsx`            |
| `/login`                         | Cliente              | `app/login/page.tsx`                                  |
| `/admin`                         | Cliente              | `app/admin/page.tsx`                                  |
| `/admin/branding`                | Cliente              | `app/admin/branding/page.tsx`                          |
| `/admin/categorias`              | Cliente              | `app/admin/categorias/page.tsx`                        |
| `/admin/compras`                 | Cliente              | `app/admin/compras/page.tsx`                           |
| `/admin/horarios`                | Cliente              | `app/admin/horarios/page.tsx`                          |
| `/admin/inventario`              | Cliente              | `app/admin/inventario/page.tsx`                        |
| `/admin/inventario/[id]`         | Cliente              | `app/admin/inventario/[id]/page.tsx`                    |
| `/admin/locales` (super_admin)   | Cliente              | `app/admin/locales/page.tsx`                            |
| `/admin/locales/[id]` (super_admin)| Cliente            | `app/admin/locales/[id]/page.tsx`                       |
| `/admin/metricas`                | Cliente              | `app/admin/metricas/page.tsx`                            |
| `/admin/pedidos`                 | Cliente              | `app/admin/pedidos/page.tsx`                              |
| `/admin/perfil`                  | Cliente              | `app/admin/perfil/page.tsx`                                |
| `/admin/productos`               | Cliente              | `app/admin/productos/page.tsx`                              |
| `/admin/punto-venta`             | Cliente              | `app/admin/punto-venta/page.tsx`                            |
| `/admin/qr`                      | Cliente              | `app/admin/qr/page.tsx`                                     |

## Layouts

### Root: `app/layout.tsx`
- Metadata global: title template, description, OG, theme color.
- Precarga fuentes (Bricolage Grotesque, Geist) desde Google Fonts.
- Wrapper `<html lang="es">` + `<body>`.

### Admin: `app/admin/layout.tsx`
- Verifica auth (hydrate del store), redirige a `/login` si no hay token válido.
- Sidebar de navegación.
- `<NotificacionesBell />` con polling cada 30s.
- Filtra menú según rol (owner ve catálogo; super_admin ve `/admin/locales` también).

## Pages clave

### `/` — Directorio
- `dynamic = 'force-dynamic'` — siempre fresco.
- `getLocales()` fetch a `/public/locales` con `cache: 'no-store'`.
- Renderiza `DirectoryClient` con la lista. Cliente filtra/busca.

### `/[slug]` — Landing
- `app/[slug]/page.tsx` server component: `fetchMenu(slug)` (de `@/lib/api`). Si 404 → `not-found.tsx`.
- Renderiza `LandingClient` con menú + branding.
- Cliente:
  - Setea CSS vars de branding.
  - Selector de categorías scroll-spy.
  - Cart side-sheet con Zustand store.
  - Modal de checkout → `POST /public/pedidos/{slug}` → abre `whatsapp_url`.

### `/login`
- Form simple. Llama `useAuth().login(email, password)`. Redirige a `/admin`.

### `/admin/*`
Cada página es cliente, hace su propio fetch contra `/api/v1/...`. Patrón típico:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ProductosPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/productos').then(({ data }) => setData(data));
  }, []);
  ...
}
```

## Not-found

`app/not-found.tsx` — fallback global para 404. Layout root sigue activo.

## Server vs Client Components

| Donde se usa Server      | Donde se usa Client                    |
|-------------------------|----------------------------------------|
| `/` directorio (fetch)   | Directorio cliente con filtros          |
| `/[slug]` landing wrapper | Landing cliente (carrito, animaciones) |
| Layouts root + admin (parcialmente) | Admin pages, login, todos los forms |

Heurística: si tiene `useState`, `useEffect`, `useStore`, event handlers, animaciones → `'use client'`.
