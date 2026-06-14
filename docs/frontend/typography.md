# Frontend — Tipografía

> Última verificación: 2026-06-14.

Las fuentes se cargan en `apps/web/src/app/layout.tsx` con un único `<link>`
a Google Fonts y `display=swap`. No se usa `next/font` para mantener el
control del payload visible.

## Familias activas

| Familia | Clase utilitaria | Uso principal |
|---------|------------------|---------------|
| **Instrument Serif** | `.ce-serif` | Display editorial: hero del local, títulos de sección, resumen del checkout, footer del local. |
| **Hanken Grotesk** | `.ce-body` | UI cálido del landing del local: cards de producto, cart, montos. |
| **Bricolage Grotesque** | `.ce-display` | Display del directorio público (home) y panel admin — antecede al rediseño cálido. |
| **Geist** | `font-sans` (default) | Body por defecto del proyecto, panel admin, login. |
| **Geist Mono** | `font-mono` | Códigos, números tabulares en métricas. |

## Reglas

- **No mezcles `.ce-serif` con `.ce-display`** en la misma pantalla. El
  landing del local usa Instrument Serif + Hanken Grotesk; el directorio
  y admin usan Bricolage Grotesque + Geist. Cada superficie debe ser
  coherente con su mundo visual.
- **`Instrument Serif` es `font-weight: 400`** siempre. Está pensado para
  display grande (≥26px) — no usar para body. Para énfasis usa el
  weight 400 italic (`<i className="ce-serif italic">`).
- **`Hanken Grotesk`** soporta 400/500/600/700/800. Usa 700–800 para
  precios y CTAs, 600 para labels.
- Para números (precios, contadores, totales) **siempre `tabular-nums`** —
  evita el "salto" cuando cambia un dígito.
- `letter-spacing`:
  - Display Instrument Serif → ya viene con `-0.01em` desde `.ce-serif`.
  - Uppercase eyebrow (`"ÚLTIMO PASO"`, `"TU PEDIDO"`) → `0.18em` a `0.2em`.
  - Hero tagline (uppercase grande) → `0.32em`.

## Por qué dos familias display

| | `.ce-display` (Bricolage Grotesque) | `.ce-serif` (Instrument Serif) |
|---|---|---|
| Familia | Sans grotesque opsz | Serif editorial |
| Pesos | 400–800 | 400 |
| Sensación | Tech / moderno / SaaS | Restaurante / editorial / cálido |
| Dónde | Directorio público, panel admin, marketing | Landing pública del local |
| Razón | Coherencia con producto "tech" para owners | Coherencia con producto "experiencia gastronómica" para comensales |

El owner ve Bricolage Grotesque cuando administra. El comensal ve
Instrument Serif cuando ordena. Son dos audiencias con expectativas
distintas; no se contaminan.

## Cargar una fuente nueva

1. Agregar la familia al `<link>` único en `apps/web/src/app/layout.tsx`:
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...&family=Nueva+Fuente:wght@400;700&display=swap" />
   ```
2. Agregar la clase utilitaria en `apps/web/src/app/globals.css`:
   ```css
   .ce-nueva { font-family: "Nueva Fuente", system-ui, sans-serif; }
   ```
3. Documentar acá cuándo se usa.

> Antes de agregar una fuente nueva preguntar: ¿realmente necesita su
> propia voz o el problema se resuelve con un weight distinto de las que
> ya tenemos? Cada familia cargada pesa ~15-30 KB.

## Ver también

- [`landing.md`](landing.md) — uso de `.ce-serif` y `.ce-body` en el landing
- [`overview.md`](overview.md) — stack frontend general
