# Sistema de logo — ClickToEat

> Actualizado 2026-06-23. El logo usa fondo **transparente** (sin rect de color).

## Anatomía del mark

El símbolo combina dos ideas: **"Click"** (cursor de mouse en naranja `#F26A1F`) y **"Eat"** (tenedor estilizado de 3 dientes + mango en tinta `#1F2937`). El fondo es transparente — el color lo pone el contenedor.

```
viewBox 0 0 32 32
├── cursor  fill="#F26A1F"  (M9 8 L9 19 L12.5 16 L14.5 20 L16.8 19 L14.8 15 L19 15 Z)
└── tenedor fill="#1F2937"
    ├── tine 1  (18,9  → 1.4×5)
    ├── tine 2  (20,9  → 1.4×5)
    ├── tine 3  (22,9  → 1.4×5)
    ├── base    (18,13.5 → 5.4×1.8)
    └── mango   (20.3,14.5 → 0.8×10)
```

## Componente `<Logo>`

`apps/web/src/components/ui/Logo.tsx`

| Prop | Default | Descripción |
|------|---------|-------------|
| `variant` | `'lockup'` | `'mark'` solo símbolo · `'lockup'` símbolo + wordmark · `'wordmark'` solo texto |
| `size` | `32` | Lado del SVG del mark en px |
| `stacked` | `false` | En lockup: texto debajo en vez de al lado |
| `fg` | `'#1F2937'` | Color del tenedor (cambiar a `#fff` si se usa sobre fondo muy oscuro) |
| `textColor` | `currentColor` | Color del wordmark |

```tsx
// Navbar landing (fondo claro)
<Logo variant="lockup" size={32} />

// Sobre fondo oscuro
<Logo variant="lockup" size={32} fg="#fff" />

// Solo ícono
<Logo variant="mark" size={48} />
```

## Assets estáticos

| Archivo | Uso | Dimensiones |
|---------|-----|-------------|
| `apps/web/public/favicon.svg` | Favicon browser, PWA shortcuts | 32×32 (any) |
| `apps/web/public/apple-icon.svg` | Apple touch icon | 180×180 |
| `apps/web/public/logo-icon.svg` | Referencia SVG canónica sin fondo | 1024×1024 |
| `apps/web/public/logo.png` | OG image placeholder | — |

Todos los SVG tienen **fondo transparente** — la plataforma (browser, iOS, Android) aplica su propio fondo según el contexto (esquinas redondeadas automáticas en iOS, fondo blanco en favicon de Chrome, etc.).

## PWA / manifest

`apps/web/public/manifest.webmanifest` referencia `favicon.svg` como icono `maskable`. El purpose `maskable` permite que Android recorte el icono en círculo / squircle con fondo del `theme_color` (`#1F2937`).

Si necesitas icono con fondo explícito para PWA (ej. Android Chrome "Add to Home"), agrega una entrada `purpose: "any"` con un PNG 512×512 de fondo crema `#FAFAF7`.

## App móvil Expo

Los PNG en `apps/mobile/assets/images/` fueron regenerados el 2026-06-23 sin fondo oscuro:

| Archivo | Tamaño | Fondo |
|---------|--------|-------|
| `icon.png` | 1024×1024 | `#FAFAF7` (crema — Expo requiere PNG opaco) |
| `favicon.png` | 64×64 | `#FAFAF7` |
| `splash-icon.png` | 512×512 | `#FAFAF7` |
| `android-icon-foreground.png` | 1024×1024 | Transparente (adaptive icon) |
| `logo-glow.png` | 512×512 | `#FAFAF7` |

`android-icon-background.png` y `android-icon-monochrome.png` **no se regeneraron** — corresponden a activos independientes del mark.

Para regenerar los PNG después de un rediseño:
```bash
cd apps/web
node -e "
const sharp = require('sharp');
// … (ver script completo en git history 2026-06-23)
"
```

## Pantalla de carga (`BrandLoader`)

`apps/web/src/components/ui/BrandLoader.tsx`

Usa `<Logo variant="mark">` internamente. El halo de pulso usa `#F26A1F` (naranja del cursor) en vez del color oscuro anterior. Se aplica en:
- `InitialLoader` — carga inicial de la app
- `RouteTransition` — cambio de ruta
- `app/loading.tsx` — Suspense de Next.js

## Reglas de uso

1. **Nunca** renderices el mark sobre un fondo que haga el tenedor invisible. Si el fondo es oscuro, pasa `fg="#fff"` o `fg="#FAFAF7"`.
2. **Nunca** comprimas el lockup a menos de 24px de alto — el tenedor pierde legibilidad.
3. **Nunca** uses el mark directamente en correos HTML — usa la URL del `apple-icon.svg` en producción.
4. El wordmark usa `Bricolage Grotesque` (weight 700). Si la fuente no cargó, hereda `sans-serif` — el layout no se rompe.
