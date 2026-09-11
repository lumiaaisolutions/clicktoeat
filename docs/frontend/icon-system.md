# Frontend — Sistema de iconos

> `apps/web/src/components/ui/Icon.tsx`. Set inline de iconos estilo
> [Lucide](https://lucide.dev/). Sin dependencia extra.

## Por qué no `lucide-react` directo

- Bundle más predecible (importamos lo que usamos, no un wrapper que tree-shake
  con cuidado).
- Control total sobre el viewBox y stroke.
- Cero risk de breaking change cuando Lucide cambie su API.

Trade-off: agregar un icono nuevo requiere editar `Icon.tsx`. Es ~30 segundos.

## Uso

```tsx
import { Icon } from '@/components/ui/Icon';

<Icon name="search" size={18} className="text-muted" />
<Icon name="whatsapp" size={20} className="text-emerald-600" />
```

Props:
- `name` — `IconName` (typed, autocompleta).
- `size` — px lado del cuadrado (default 20).
- `strokeWidth` — default 2.
- `className` — Tailwind. Respeta `currentColor`.

## Catálogo actual

| Categoría | Iconos |
|-----------|--------|
| Navegación | `search`, `arrow-right`, `arrow-up-right`, `chevron-right`, `chevron-down`, `navigation`, `compass`, `map-pin` |
| Accionable | `plus`, `minus`, `x`, `check`, `check-circle`, `download`, `copy` |
| Estado | `star`, `star-filled`, `heart`, `heart-filled`, `alert-triangle`, `bell`, `circle` |
| Marca / dominio | `whatsapp`, `utensils`, `storefront`, `qr-code`, `truck`, `clock`, `phone`, `message-circle` |
| Decorativo | `sparkles`, `zap`, `shield`, `sun`, `moon`, `gift` |
| Social | `instagram`, `facebook` |
| **Food — comida** | `pizza`, `sandwich`, `soup`, `beef`, `drumstick`, `fish`, `egg`, `croissant`, `popcorn` |
| **Food — postres** | `cake`, `ice-cream`, `cherry`, `popsicle`, `apple` |
| **Food — bebidas** | `coffee`, `beer`, `wine`, `martini-glass`, `cup-soda`, `milk` |
| **Food — conceptos** | `salad`, `sprout`, `wheat`, `flame` |
| **Flechas / navegación (sept 2026)** | `arrow-left`, `arrow-up`, `arrow-down`, `corner-down-right`, `refresh-cw`, `menu` |
| **Gastos / operación (sept 2026)** | `droplet`, `globe`, `wrench`, `megaphone`, `clipboard`, `landmark`, `file-text`, `paperclip`, `pencil`, `trending-down`, `trending-up` |
| **Conceptos (sept 2026)** | `lightbulb`, `smartphone`, `hand` |

> Total al 2026-09-10: **~110 iconos**. La tanda de junio cubrió food/categorías;
> la de septiembre 2026 se agregó para el **barrido total de emojis→íconos**
> (flechas, categorías de gasto, acciones de inventario, InfoBox, etc.).
>
> **Mapa de categorías de gasto** (`/admin/gastos`): luz→`zap`, agua→`droplet`,
> gas→`flame`, internet→`globe`, teléfono→`phone`, renta→`home`, nómina→`users`,
> mantenimiento→`wrench`, marketing→`megaphone`, impuestos→`file-text`,
> seguros→`shield`, comisiones bancarias→`landmark`, otros→`circle`.

## IconPicker — selector visual para admin

`components/ui/IconPicker.tsx` provee un selector de iconos con vista
previa para que el owner elija desde `/admin/categorias`:

- **Grid 4-6 cols** con 31 opciones curadas (food/restaurant).
- Cada opción con label en español user-friendly.
- Preview grande del seleccionado arriba del grid + checkmark verde en la opción activa.
- Reemplazó el viejo input de texto "Icono (font-awesome)" que pedía
  adivinar `fa-pizza-slice`.

La lista `CATEGORY_ICONS` está exportada del módulo y puede reutilizarse en
otros lugares (ej. tabs públicos del directorio).

Para agregar uno nuevo:

1. Buscar el SVG en https://lucide.dev/
2. Agregar el nombre al union `IconName` (orden alfabético dentro de su categoría)
3. Agregar el path en `ICON_PATHS` (copiar el JSX del SVG sin atributos
   raíz — el wrapper los añade)

Ejemplo:

```tsx
'pizza': (
  <>
    <path d="M15 11h.01" />
    <path d="M11 15h.01" />
    {/* … */}
  </>
),
```

## Tamaños y peso visual

Tabla de referencia:

| Contexto | Size | Stroke |
|----------|------|--------|
| Texto inline (junto a label) | 13–14 | 2 |
| Botón secundario | 16 | 2 |
| Botón primario / CTA | 18 | 2 |
| Header de card | 18–20 | 2 |
| Hero icon decorativo | 24+ | 1.5 (más fino) |

Stroke 1.5 da sensación más editorial; 2 es el default Lucide.

## Reglas

- **NO usar emojis en código de producción.** Barrido total ejecutado en
  sept 2026 (panel + landing + glifos `✓ ✕ ★`). Excepción consciente: los
  emojis del **mensaje de WhatsApp** (`lib/whatsapp.ts` y su espejo backend)
  son parte del texto del pedido que recibe el local, no íconos de UI — no se
  tocan. Si agregas UI nueva, usa `<Icon>`, nunca un emoji literal.
- Si necesitas un icono que **no está**, agrégalo a `Icon.tsx` en vez de
  hacer inline SVG suelto en la página. Mantiene consistencia.
- **Respeta `currentColor`**. No pongas `fill="#XXX"` hard-coded en los paths.
  El color viene del Tailwind class (`text-…`).
- Para variantes "filled" (heart-filled, star-filled), usa el sufijo `-filled`.
  No crees `<Icon variant="filled" />` — explota el switch de nombres.

## Limitaciones

- No hay icon tooltips integrados — usar `<button title="..." aria-label="...">`.
- No hay variantes animadas. Si necesitas un spinner, usa CSS `animate-spin`
  sobre `compass` o `circle`.

## Ver también

- [`landing-sections.md`](./landing-sections.md) — Iconos en secciones de marketing
- [`components.md`](./components.md) — Resto del kit UI (Button, Modal, FormField, etc.)
