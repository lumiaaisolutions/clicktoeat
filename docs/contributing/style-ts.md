# Contribución — Estilo TypeScript / React

## TypeScript

- `strict: true` activado en `tsconfig.json`. No bajar.
- **No** `any` explícito — usar `unknown` y narrow.
- Interfaces para shapes de datos; types para uniones.
- Tipar funciones públicas con retorno explícito; locales pueden inferir.

```ts
// ✅ ok
interface CartItem {
  productoId: number;
  cantidad: number;
}

function addToCart(item: CartItem): void { ... }

// ❌ evitar
const handler: any = ...
```

## Path alias

`@/*` → `src/*`. Siempre usar el alias, nunca paths relativos profundos (`../../../`).

```ts
// ✅
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';

// ❌
import { api } from '../../lib/api';
```

## Server vs Client

- Default: **Server Component** (sin `'use client'`).
- Agregar `'use client'` sólo si el archivo tiene `useState`, `useEffect`, `useReducer`, event handlers, animaciones, mapas, stores.

## React

- Componentes con PascalCase. Props tipadas inline:
  ```tsx
  interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'ghost';
    loading?: boolean;
  }

  export function Button({ children, onClick, variant = 'primary', loading }: ButtonProps) {
    return (...);
  }
  ```
- **No** `React.FC<Props>` (deprecated por la comunidad).
- `key` con valor estable cuando se mapean listas.
- Boolean props sin valor: `<Modal open />` (no `<Modal open={true} />`).

## Zustand

- Selectores granulares en componentes:
  ```ts
  const user = useAuth(s => s.user);          // ✅ re-render selectivo
  const { user, login } = useAuth();          // ❌ re-render con cualquier cambio
  ```
- Acciones sincronas devuelven `void`; asincronas `Promise<void>` con nombre explícito.

## API calls (axios)

- Centralizar la base URL y interceptors en `lib/api.ts`. **No** crear instancias axios sueltas.
- Try/catch siempre con extracción tipada del error:
  ```ts
  try {
    await api.post('/productos', body);
    toast.success('Guardado');
  } catch (err: any) {
    toast.error(err?.response?.data?.message ?? 'Error');
  }
  ```

## Tailwind

- Utilities directos en el JSX.
- Composición con `cn(...)` (clsx + tailwind-merge) para condicionales.
  ```tsx
  <button className={cn('rounded-2xl px-4 py-2', variant === 'primary' && 'bg-accent text-white')}>
  ```
- Colores con CSS vars del branding: `bg-accent`, `text-ink`, `bg-bg`, `border-line`.
- Breakpoints: `xs:` (380px) para iPhone SE; resto standard.

## File naming

| Tipo                  | Patrón                |
|-----------------------|-----------------------|
| Componente React       | PascalCase `.tsx` (`Button.tsx`) |
| Hook personalizado     | camelCase `use*.ts`   |
| Store Zustand          | camelCase `.ts`        |
| Utilities              | camelCase `.ts`        |
| Page                   | `page.tsx` (App Router) |
| Layout                 | `layout.tsx`            |

## Lint y type check

```bash
cd apps/web
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

Antes de commitear.

## State pattern

- **Local component state** (`useState`) para UI efímera (un modal abierto, un campo controlado).
- **Zustand store** para estado que cruza componentes (auth, cart, toasts).
- **Server fetch** (`api.get`/`fetch`) para datos remotos. **No hay React Query / SWR** todavía → cada page maneja loading/error a mano (pendiente migrar).

## Animaciones

- `framer-motion` para transiciones de página, modales, listas con `AnimatePresence`.
- CSS transitions de Tailwind para hover/focus.
- Para animaciones scroll-driven, usar los patrones canónicos: ver [`frontend/scroll-animations.md`](../frontend/scroll-animations.md).
- `useScroll`/`useTransform`/`useSpring` para scrubbing tipo Apple. Ver `BurgerSequence.tsx` como referencia.

## Iconos

- **No** usar emojis en código de producción. Cambiar a `<Icon name="..." />`
  del set en `apps/web/src/components/ui/Icon.tsx`.
- Si necesitas un icono que no está → agregarlo a `Icon.tsx` (ver
  [`frontend/icon-system.md`](../frontend/icon-system.md)).

```tsx
// ❌ NO
<span>⭐ Tus favoritos</span>

// ✅ SÍ
<Icon name="star-filled" size={14} className="text-amber-500" />
Tus favoritos
```

Razón: emojis se renderizan distinto por OS (Apple Color Emoji vs Twemoji vs
Noto). Crean inconsistencia visual y a veces problemas de tamaño con Bricolage.

## Patrones a evitar

- ❌ `dangerouslySetInnerHTML` con contenido del backend (XSS).
- ❌ `useEffect` con dependencias vacías + estado que se actualiza dentro (causa loops).
- ❌ Mutación directa de estado (`store.items.push(...)`).
- ❌ Render condicional pesado en `useEffect`.
- ❌ `console.log` committed (eslint lo permite — sé disciplinado).
- ❌ Importar TODO de framer-motion (`import * as ...`) — usa imports nominales.
