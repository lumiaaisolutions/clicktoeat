# Orbs interactivos + fix mobile PinnedFoodStory — 2026-06-18 (tarde)

2 cambios visuales en el landing principal.

## 1. Orbs interactivos en el hero

### Antes

```tsx
<div className="hero-orb" style={{ background: '#FF2D2D', ... }} />
<div className="hero-orb" style={{ background: '#10b981', ... }} />
```

Dos divs estáticos. La clase `.hero-orb` solo aplicaba blur + border-radius.
Cero movimiento, cero interactividad.

### Después

Nuevo componente `apps/web/src/components/landing/InteractiveOrbs.tsx`:

- **3 orbs por defecto** (rojo, verde, naranja) con tamaños y posiciones
  configurables vía prop.
- **Float continuo**: cada orb sube/baja en loop infinito 8-13s con offset
  distinto. Animación + escala (1 → 1.08 → 0.96 → 1) simula respiración.
- **Reacción al mouse**: cada orb tiene un `follow` (-1 a +1) que
  determina cuánto se mueve hacia el cursor. Spring con damping suave
  (stiffness 60, damping 18) para que no se sienta nervioso.
- **Touch-aware**: en dispositivos con `(hover: none)` (mobile/tablet)
  NO se monta el event listener de mousemove → ahorra batería.
- **2 capas internas** (`wrapper` + `inner`) para que el transform del
  mouse (`x`/`y`) NO colisione con el transform del float
  (`translateY`/`scale`). Sin esto, los dos animaciones se peleaban por
  la misma propiedad y la respiración se cortaba.

Configuración default:

| Orb | Color | Size | Position | Opacity | Follow |
|---|---|---|---|---|---|
| 1 | `#FF2D2D` (rojo) | 520px | top-left | 0.45 | +0.8 (sigue) |
| 2 | `#10b981` (verde) | 360px | bottom-left | 0.18 | -0.6 (huye) |
| 3 | `#FFA62D` (naranja) | 280px | center-mid | 0.12 | +0.4 (sigue) |

Reemplazo en `apps/web/src/app/DirectoryClient.tsx` — `HeroDirectory`:

```diff
- <div aria-hidden className="absolute inset-0 pointer-events-none">
-   <div className="hero-orb" style={{ background: '#FF2D2D', ... }} />
-   <div className="hero-orb" style={{ background: '#10b981', ... }} />
- </div>
+ <InteractiveOrbs />
```

## 2. Fix mobile de PinnedFoodStory ("Cero comisiones…")

### Problema

En mobile el viewport ~700-800px no alcanzaba para mostrar texto +
imagen del frame "Cero comisiones. Cero intermediarios.":

- `aspect-[4/5]` + `w-full` → la imagen medía ~412px de alto
- `h-[280px]` reservaba 280px fijos para el texto aunque el título fuera corto
- `h-screen` del sticky se calculaba con la URL bar VISIBLE → en iOS al
  hacer scroll, la URL bar se ocultaba y el contenedor quedaba MÁS alto
  que el viewport real → todo el sistema sticky se desfasaba
- Total: ~700px de contenido en un viewport efectivo más chico = "Cero
  comisiones" se veía cortado, la imagen ocupaba demasiado

### Fix

`apps/web/src/components/landing/PinnedFoodStory.tsx`:

1. **`h-screen` → `h-[100svh]`**: small viewport height excluye la URL
   bar dinámica. Safari/Chrome iOS lo respetan y el sticky deja de
   desfasarse.
2. **Imagen mobile**:
   - `aspect-[4/5]` → `aspect-[4/3]` (más ancha que alta)
   - `max-h-[45svh]` (cap absoluto a la mitad del viewport)
   - `max-w-[420px] mx-auto` (no más ancha que el contenedor de texto)
3. **Texto mobile**:
   - `h-[280px]` → `min-h-[180px]` (auto, sin reservar espacio inútil)
   - Título: `text-4xl` → `text-[26px]` en mobile (cabe en 2 líneas en
     iPhone SE)
   - Body: `text-base` → `text-sm` para que el bloque entero ocupe menos
4. **Gap reducido**: `gap-8` → `gap-4 sm:gap-6` en mobile/tablet (más
   aire libre para que el texto encaje sin amontonarse).
5. **Padding vertical**: `py-4` en mobile para que ni el texto ni la
   imagen se peguen al borde del viewport sticky.

Resultado: en iPhone 13/14 ambos elementos quedan visibles cómodamente
en un viewport, el cross-fade ocurre como en desktop sin nada cortado.

## Archivos tocados

```
apps/web/src/app/DirectoryClient.tsx                            # +InteractiveOrbs
apps/web/src/components/landing/InteractiveOrbs.tsx             # nuevo
apps/web/src/components/landing/PinnedFoodStory.tsx             # fix mobile
```

## Verificación

- ✅ TypeScript estricto OK
- ✅ Next.js build OK sin warnings
- ✅ Tested local: orbs siguen mouse en desktop, no rastrean en mobile
- ✅ Mobile: viewport 375x812 (iPhone X-like) muestra texto + imagen sin overflow
