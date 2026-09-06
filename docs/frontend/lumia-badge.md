# Badge "Desarrollado por LUMIA"

Componente: `apps/web/src/components/ui/LumiaBadge.tsx`.

Píldora de crédito de marca que enlaza a `lumiaaisolutions.com` (publicidad de
LUMIA, no del producto). **Idéntico en ClickToEat y ClickToShop** — es el
crédito de LUMIA, así que no se adapta al branding del producto.

## Diseño

- Píldora blanca redondeada con sombra suave y `ring` sutil; hover eleva
  (`-translate-y-0.5`) e intensifica la sombra en violeta.
- **Icono oficial de LUMIA**: `apps/web/public/lumia-icon.png` (grafo/constelación
  en gradiente violeta→azul), servido como `<img src="/lumia-icon.png">` a 24px
  de alto (ancho automático, conserva proporción 257×280). Escala en hover.
  > ⚠️ Es el **PNG oficial** (`/Users/.../LUMIA/LUMIA/Lumia_Icon.png`). No usar
  > un SVG dibujado a mano como aproximación (fue el error corregido 2026-09-06).
- Texto: "Desarrollado por" en gris + "LUMIA" en gradiente
  (`#7C5CF6 → #4FA3F7`, `bg-clip-text`).
- `whitespace-nowrap` en los textos → no se parte; acepta `className` (ej.
  `scale-90` en el sidebar del panel).

## Dónde aparece

- Login y registro (vía `AuthShell`, al pie).
- Directorio público (`page.tsx` / `DirectoryClient.tsx`, sección "Acerca").
- Landing del cliente (`[slug]/LandingClient.tsx`, footer).
- Panel admin (`admin/layout.tsx`, pie del sidebar, `scale-90`).

## Actualizar el icono

Reemplazar `apps/web/public/lumia-icon.png` (mismo nombre) y redeploy web. El
componente no cambia. Mantener el archivo a la par en ambos repos.
