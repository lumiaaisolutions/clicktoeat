# Frontend — AdminPageHeader (módulos admin)

> `apps/web/src/components/admin/AdminPageHeader.tsx`. Componente reusable
> que homologa el header de TODOS los módulos del admin con el lenguaje
> visual establecido por `/admin/branding` (kicker + título Bricolage +
> segunda línea con gradient + descripción muted + slot de actions).

## Uso

```tsx
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

<AdminPageHeader
  kicker="Productos"
  kickerIcon="package"
  title="Tu menú,"
  titleAccent="lo que tus clientes ven."
  description="Cada producto aparece automáticamente en tu landing pública."
  tourSlug="productos"
  actions={<Button onClick={...}>+ Nuevo producto</Button>}
/>
```

## Props

| Prop | Tipo | Notas |
|------|------|-------|
| `kicker` | `string` | Etiqueta uppercase pequeña sobre el título. |
| `kickerIcon` | `IconName` | Icono del kicker (default `sparkles`). Color accent. |
| `title` | `string` | Primera línea del título. Bricolage Grotesque bold clamp(3xl-5xl). |
| `titleAccent` | `string?` | Segunda línea opcional renderizada en gradient ce-accent → orange. |
| `description` | `string?` | Sub-título descriptivo muted. 1 frase corta. |
| `actions` | `ReactNode?` | Slot derecho para CTAs (botón guardar, nuevo, filtros…). |
| `tourSlug` | `string?` | Si se pasa, renderiza el botón "?" que dispara el tour del módulo. |

## Aplicado en

Tras Fase 14 (2026-06-15) todos estos módulos usan `AdminPageHeader`:

- `/admin/productos` — kicker `Productos`, tour `productos`, CTA "+ Nuevo producto"
- `/admin/categorias` — kicker `Categorías`, tour `categorias`
- `/admin/pedidos` — kicker `Pedidos`, tour `pedidos`, filtros como actions
- `/admin/inventario` — kicker `Inventario`, tour `inventario`
- `/admin/compras` — kicker `Compras`, tour `compras`
- `/admin/staff` — kicker `Equipo`, tour `staff`
- `/admin/audit-log` — kicker `Historial`, tour `audit-log` (label reemplazado)
- `/admin/metricas` — kicker `Reportes`, tour `metricas`
- `/admin/qr` — kicker `Código QR`, tour `qr`
- `/admin/horarios` — kicker `Horarios`, tour `horarios`
- `/admin/perfil` — kicker `Mi perfil`
- `/admin/ayuda` — kicker `Centro de ayuda`
- `/admin/branding` — original (sirvió como referencia visual)
- `/admin/billing` — kicker `Tu suscripción`

`/admin/punto-venta` mantiene header propio (layout split panel-único).

## Anatomía visual

- `rounded-3xl border border-line bg-white`
- Padding interno `p-5 sm:p-7 md:p-9`
- Grid `lg:grid-cols-[1fr_auto]` — actions a la derecha en desktop, abajo
  en mobile
- 3 radial gradients sutiles decorativos (rojo top-right, naranja
  bottom-right, esmeralda bottom-left) con opacity 60%
- Animación de entrada `motion` desde `y:-6` a `y:0`

## Tour engine

El botón "?" abre el tour del módulo via `useHelpCenter.openTour(slug)`.
Ver [`help-tour.md`](help-tour.md) para detalles del sistema de tours.
