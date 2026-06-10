# Frontend — Stores Zustand

`apps/web/src/store/`. Cuatro stores, todos client-only (`'use client'`).

## `auth` (`store/auth.ts`)

Estado del usuario autenticado.

```ts
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email, password) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}
```

- **Persist** con `localStorage` bajo `clickeat:auth`. `partialize` sólo guarda `user` (no `loading`).
- El **token** vive aparte (`tokenStore` en `lib/api.ts` → `localStorage:clickeat:token`). Razón: separar concern.
- `login` → POST `/auth/login` → guarda token + user.
- `logout` → POST `/auth/logout` (best effort) → limpia token + user.
- `hydrate` → si hay token, GET `/auth/me`, sino no hace nada. Si la llamada falla con 401, limpia todo.

Se llama desde `app/admin/layout.tsx` al montar.

## `cart` (`store/cart.ts`)

Carrito del cliente público (per-tenant).

```ts
interface CartState {
  localSlug: string | null;
  items: CartItem[];
  setLocal(slug: string): void;
  add(item): void;
  remove(lineKey): void;
  setQty(lineKey, qty): void;
  clear(): void;
  subtotal(): number;
  itemCount(): number;
}
```

- **Persist** en `localStorage:clickeat:cart`.
- **`setLocal(slug)` purga el carrito si cambia el local** — evita que el cliente arrastre items de Tacos a Pizza.
- `lineKey` es la llave única por (producto + combinación de extras) — permite añadir el mismo producto con dos sets de extras como líneas distintas.
- `add` con `lineKey` existente → suma cantidades; nuevo → crea línea.
- `setQty(.., 0)` → equivale a remove.

Se invoca desde `LandingClient.tsx`.

## `notificaciones` (`store/notificaciones.ts`)

Notificaciones in-app del owner + bandeja de pedidos activos.

```ts
interface NotificacionesState {
  items: Notificacion[];
  noLeidas: number;
  pedidosNuevos: Pedido[];
  loading: boolean;
  pollHandle: ReturnType<typeof setInterval> | null;
  refresh(): Promise<void>;
  marcarLeida(id): Promise<void>;
  marcarTodasLeidas(): Promise<void>;
  startPolling(): void;
  stopPolling(): void;
}
```

- **NO persist** (es estado vivo, no tiene sentido cachearlo).
- `refresh` → GET `/notificaciones` → extrae `data`, `no_leidas`, `pedidos_activos` (filtra `estado === 'nuevo'` para `pedidosNuevos`).
- `marcarLeida` con update optimista (no espera respuesta para bajar contador).
- `startPolling` → `refresh()` inmediato + `setInterval(30_000)`. Idempotente: no arranca un segundo si ya hay handle.
- `stopPolling` → `clearInterval`.

Se invoca desde `app/admin/layout.tsx` (start en mount, stop en unmount).

## `toast` (`store/toast.ts`)

Notificaciones efímeras en pantalla.

```ts
interface ToastState {
  toasts: ToastItem[];
  push(kind, text): void;
  dismiss(id): void;
}
```

- Sin persist.
- `push` genera UUID, agrega, y agenda auto-dismiss a los 4 segundos.
- Helper global exportado:
  ```ts
  export const toast = {
    success: (text) => useToast.getState().push('success', text),
    error:   (text) => useToast.getState().push('error',   text),
    info:    (text) => useToast.getState().push('info',    text),
  };
  ```
  → uso desde cualquier código (incluyendo non-component) sin hook ni provider.

## Patrones

- **Sin provider**: los stores de Zustand son módulos importados, no necesitan envolverlos.
- **Selectores granulares** en componentes para evitar re-renders innecesarios:
  ```ts
  const user = useAuth(s => s.user);          // re-render solo si user cambia
  const login = useAuth(s => s.login);        // función estable
  ```
- **No usar `useAuth()` completo** (sin selector) — re-renderiza con cualquier cambio.
- **Funciones helpers globales** (como `toast.success`) son ergonómicas para llamadas fuera de componentes — usar con criterio.
