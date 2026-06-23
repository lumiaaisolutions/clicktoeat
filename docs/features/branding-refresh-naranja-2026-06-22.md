# Branding refresh — rojo → naranja (2026-06-22)

> Cambio de identidad cromática para alinear el sistema visual con el
> nuevo logo PNG (orange + dark grey) entregado por el usuario.

## Decisión

`--ce-accent` cambia de **`#FF2D2D` (rojo)** a **`#F26A1F` (naranja del logo)**.

El dark de marca para fondos del mark/iconos cambia de **`#0B0B0F`
(negro casi puro)** a **`#1F2937` (dark grey)** — matchea el fondo del PNG
y suaviza el contraste en backgrounds claros.

## Archivos modificados

### Definición central de tokens

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/app/globals.css` | `--ce-accent: #FF2D2D` → `#F26A1F` |
| `apps/web/tailwind.config.ts` | `colors.accent` fallback al naranja |
| `apps/web/src/app/layout.tsx` | `viewport.themeColor: '#0B0B0F'` → `'#1F2937'` |

### Assets PWA / iconos

| Archivo | Cambio |
|---------|--------|
| `apps/web/public/favicon.svg` | fondo `#1F2937`, cursor `#F26A1F`, fork `#fff` |
| `apps/web/public/apple-icon.svg` | mismas reglas, viewBox 180×180 |
| `apps/web/public/manifest.webmanifest` | `theme_color: '#1F2937'` |
| `apps/web/public/logo.png` | **nuevo** — 1080×976 PNG del usuario (564 KB) |

### Componente Logo

`apps/web/src/components/ui/Logo.tsx`:
- `bg` default: `#0B0B0F` → `#1F2937`
- Cursor (path interno): pasa a usar la nueva constante `cursor = '#F26A1F'`
- Wordmark "ClickToEat": el "Eat" final ahora pinta en `cursor` (naranja)

### Pantallas hero (PNG en vez de SVG component)

`/login` y landing root reemplazan el `<Logo variant="lockup" />`
del hero por `<Image src="/logo.png" priority />`:

- `apps/web/src/app/login/page.tsx` (height 80px)
- `apps/web/src/app/DirectoryClient.tsx` (height 96-112px responsive)

El SVG Logo component sigue activo en sidebar, footer y otros chrome
porque el PNG no escala tan bien a tamaños chicos (28-32 px) y el SVG
ya hereda el naranja por el cambio interno.

### Bulk replace `#FF2D2D` → `#F26A1F`

35+ archivos del web que tenían literales hardcoded del rojo viejo
(componentes, fallbacks en `var(--ce-accent, #FF2D2D)`, demos, tours,
illustrations, BrandLoader, InteractiveOrbs, etc.). Hecho con:

```bash
grep -rl "#FF2D2D" apps/web/src | xargs sed -i '' 's/#FF2D2D/#F26A1F/g'
```

Verificado: 0 matches restantes en `apps/web/src/`.

## Lo que **no** se tocó

- Las definiciones de color de cada local (`Local.branding.color_primario`)
  son configurables por owner. Si tenían `#FF2D2D` antes era porque la
  UI los inicializaba con ese default — pero los colores ya guardados en
  BD para locales existentes NO se modificaron (los respeta cada landing).

- `apps/api/` no tiene color hardcoded relevante (los mailables y PDFs
  usan vars Tailwind o leen del branding del local).

- Stripe / Sentry / Hostinger admin: sin cambios visuales.

## Por qué `#F26A1F` y no `#FF6B35` (gradient stop)

El gradient `gradient-text` (en `globals.css`) usa 3 colores:
`#F26A1F 0% → #FF6B35 50% → #FFA62D 100%`. Se conservó porque transmite
calidez y matchea el degradé del CTA principal. Solo el "anchor" cambió.

## Verificación visual

- `https://clicktoeat.lumiaaisolutions.com/` → hero con logo PNG grande
- `https://clicktoeat.lumiaaisolutions.com/login` → logo PNG sobre form
- `https://clicktoeat.lumiaaisolutions.com/admin` → sidebar con cursor
  naranja en lockup + acento naranja en notificaciones/badges
- PWA install: theme color dark grey + ícono naranja

## Si en el futuro hay que volver al rojo

```bash
cd apps/web
grep -rl "#F26A1F" src public | xargs sed -i '' 's/#F26A1F/#FF2D2D/g'
grep -rl "#1F2937" src public | xargs sed -i '' 's/#1F2937/#0B0B0F/g'
# y restaurar manifest.webmanifest theme_color
```

(No hay razón conocida para hacerlo. Estaba bien antes, está bien ahora.)

## Decisión registrada

No es un ADR formal porque no cambia arquitectura — es un refresh
cosmético con scope acotado. El "por qué" vive acá y en el commit `e74dddb`.
