# Frontend — Secciones modulares de la home

> Componentes en `apps/web/src/components/landing/`. Cada sección es una
> unidad autónoma con su propio scroll trigger, animación y datos hardcoded.
>
> Se ensamblan desde `DirectoryClient.tsx`. Si se reordenan, no se rompe
> nada — cada sección es independiente.

## Inventario

| Archivo | Propósito | Animación característica |
|---------|-----------|--------------------------|
| `BurgerSequence.tsx` | Image-sequence scrubbing real con 168 JPGs | Canvas fixed right-50vw, scroll-driven |
| **`PinnedFoodStory.tsx`** (2026-06-14) | 3 frames imagen+texto con foto real (Unsplash) — historia visual breve | Image sticky + cross-fade entre frames + progress bar inferior |
| `ScrollPhoneSequence.tsx` (legacy) | Demostración del flujo en 4 frames con phone mockup SVG/HTML | Image-sequence scrubbing — **no se monta desde 2026-06-14**, queda en repo por si se rescata |
| `WhyClickToEatSection.tsx` | 4 razones por las que el producto existe | Editorial — números 01-04, scroll fade staggered, headline sticky |
| `SystemPreviewSection.tsx` | Browser mockup del panel admin + texto explicativo | Parallax y scale del mockup |

`CTAOwnerSection`, `ShareQRSection`, `Footer` y `Hero` siguen viviendo en
`DirectoryClient.tsx` porque son co-dependientes con su estado local
(`url` del QR, `userCoords`, etc.).

## BurgerSequence — image-sequence scrubbing con frames reales

Componente con **168 frames JPG** (1280×720, ~26 KB cada uno, 4.3 MB total)
montados como secuencia controlada por scroll. La animación es una hamburguesa
que se va armando/desarmando conforme el usuario scrollea.

### Layout

- `position: fixed`, `right: 0`, `inset-y-0`, `width: 50vw`
- `z-index: 0` — detrás del contenido editorial
- `hidden lg:block` — **no se renderiza en mobile** (peso prohibitivo)
- Mask gradient izquierdo (`mask-image: linear-gradient(to right, transparent 0%, black 18%)`)
  para fundir con el texto del hero sin línea dura

### Scroll mapping

| Scroll progress | Frame index | Visibilidad |
|-----------------|-------------|-------------|
| 0% → 1% | 0 | Fade-in (0.85 → 1) |
| 1% → 34% | 0 → 167 | Animación corre completa |
| 34% → 42% | 167 | Fade-out (1 → 0) |
| 42% → 100% | — | Invisible |

La animación termina antes de las secciones full-width
(`ScrollPhoneSequence`, `WhyClickToEat`, `SystemPreview`) porque sus
fondos `bg-white`/`bg-bg` cubrirían el canvas y crearía conflicto visual.

### Pipeline técnico

```
useEffect (mount once)
   │
   ├─ for i in 0..167: new Image(); img.src = `/frames/burger/...`
   │     └─ img.onload → setLoadedCount(c+1)
   │
useScroll()
   └─ scrollYProgress
        │
        ├─ useTransform → rawIndex
        │     └─ useSpring → smoothIndex (stiffness 120, damping 28)
        │           └─ useMotionValueEvent('change') → drawFrame(v)
        │                 └─ ctx.drawImage(imagesRef.current[Math.floor(v)])
        │
        └─ useTransform → opacity
              └─ <motion.canvas style={{ opacity }} />
```

`useSpring` suaviza el scrub aunque el trackpad mande saltos discretos.
`useMotionValueEvent` muta el canvas **fuera** del ciclo de render de React
— ningún componente se re-renderiza durante el scroll.

### Resilencia

Si el frame objetivo aún no terminó de cargar (típico en los primeros
200ms), `drawFrame()` busca el frame cargado más cercano (±n) y lo
dibuja para evitar flicker o pantalla en blanco.

### Performance

- **Bundle JS**: ~3 KB del componente.
- **Network**: 168 GETs paralelos (~4.3 MB total). Cacheable indefinidamente.
- **Render**: una vez cargados, redibujar es `ctx.drawImage` — <1 ms.
- **DPR-aware**: canvas se redimensiona al `devicePixelRatio` (cap 2) para
  sharp en pantallas HiDPI sin desperdiciar memoria.

### Cuándo NO usar

- Si los frames pesan >10 MB total — móviles 3G/4G sufren.
- Si la animación no contribuye al mensaje (es solo decorativa).
- Si el contenido editorial necesita TODO el ancho del viewport — el
  canvas requiere ~50% del width para verse decente.

## PinnedFoodStory — anatomía (2026-06-14)

Reemplazó a `ScrollPhoneSequence` en la home (`<PinnedFoodStory />` se monta
después de los locales, antes de `WhyClickToEatSection`). Cuenta una
historia visual breve con **3 frames** de foto real + texto conciso:

| # | Kicker | Título | Body |
|---|--------|--------|------|
| 01 | Antojo | "El antojo entra por la pantalla." | "Tu menú, con foto y precio real, abierto en el celular." |
| 02 | Pedido | "Un toque y va directo a tu WhatsApp." | "Sin app que descargar, sin cuenta que crear." |
| 03 | Tuyo | "Cero comisiones. Cero intermediarios." | "El pedido es de tu cliente. El dinero, todo tuyo." |

### Layout

- Section de altura `frames * 110vh` (= 330vh con 3 frames). Eso da una
  ventana de 1.1 viewports por frame — pausa cómoda + transición tranquila.
- Dentro: `sticky top-0 h-screen` con grid `lg:grid-cols-2`:
  - **Imagen** (lg-order 1): `aspect-[4/5]` con `border-radius:24px`,
    sombra grande. Mobile la pone debajo del texto.
  - **Texto** (lg-order 2): kicker uppercase letterspaced + título Bricolage
    bold clamp(4xl-6xl) + body 1 línea texto-muted.
- Barra de progreso inferior (3 segmentos) sobre la imagen indica el frame
  activo y se llena de izquierda a derecha mientras scrolleas.

### Cross-fade implementación

Cada frame mapea a un rango `[i/total, (i+1)/total]` de `scrollYProgress`.
La función helper `frameOpacity(index, total, progress)` genera una
`MotionValue` con 4 keyframes:

```
[start - fadeIn,  start,  end,  end + fadeIn]
[opacityFrom,     1,      1,    opacityTo  ]
```

- El primer frame nunca se desvanece por la izquierda (queda visible al
  llegar a la sección desde arriba).
- El último nunca se desvanece por la derecha (queda hasta que sales).
- `fadeIn = segment * 0.18` — ventana de cross-fade del 18% del segmento.

Cada `FrameImage` también recibe `scale: 1.05 → 1` para un sutil zoom-out
durante el frame activo (ken-burns sin ser invasivo).

Cada `FrameText` además se desliza `y: 30 → 0` 15% antes de la entrada,
para que el texto se "ensamble" mientras la imagen aparece.

### Imágenes

Las 3 fotos vienen de Unsplash (uso comercial libre, sin atribución
obligatoria). Para sustituirlas por shots propios o por imágenes del CMS,
editar el array `FRAMES` en `PinnedFoodStory.tsx`:

```ts
const FRAMES: Frame[] = [
  { image: 'https://…/comida.jpg',  alt: '…', kicker: '01 · Antojo', icon: 'sparkles',  title: '…', body: '…' },
  { image: 'https://…/whatsapp.jpg', alt: '…', kicker: '02 · Pedido', icon: 'whatsapp',  title: '…', body: '…' },
  { image: 'https://…/local.jpg',    alt: '…', kicker: '03 · Tuyo',   icon: 'storefront', title: '…', body: '…' },
];
```

`next.config.mjs` ya tiene `images.unsplash.com` en `images.remotePatterns`
por si se migra a `next/image` (hoy usa `<motion.img>` plano por
simplicidad).

### Performance

- Primera imagen con `loading="eager"`, resto con `loading="lazy"`
  (cargan cuando entran al viewport).
- Sin canvas, sin frames hidratados — solo 3 `<img>` overlapped con
  opacity controlada por `useTransform`. Trivial de renderizar a 60fps.
- Bundle de `/` bajó de 19.3 → 17.5 kB al sustituir
  `ScrollPhoneSequence` (que era 463 líneas con mockup SVG completo).

### Cuándo NO usar

- Si necesitas más de 5 frames — el cross-fade se vuelve confuso. Prefiere
  un carrusel con autoplay pausable.
- Si las imágenes pesan más de ~250 KB cada una — ajusta el `q=80` de
  Unsplash o cambia a srcset por viewport.

## ScrollPhoneSequence — anatomía (legacy — no se monta desde 2026-06-14)

Implementa **image-sequence scrubbing** sin necesidad de PNGs:

```
┌──────── container 320vh ─────────┐
│                                   │
│  ┌── sticky 100vh ──────┐         │  scrollYProgress: 0 → 1
│  │                       │         │
│  │  [steps]   [phone]   │         │  Cada step domina 25% del scroll
│  │             │         │         │
│  │             ├ Frame 0 (catálogo)
│  │             ├ Frame 1 (checkout)
│  │             ├ Frame 2 (WhatsApp)
│  │             └ Frame 3 (panel)
│  └───────────────────────┘         │
│                                   │
│  (espacio adicional para scrub)   │
└───────────────────────────────────┘
```

Técnica con `framer-motion`:

```ts
const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ['start start', 'end end'],
});

// Cada frame tiene su rango de opacity controlado por scroll
function rangeOpacity(progress, index) {
  const seg = 1 / STEPS.length;
  const start = index * seg;
  const end = (index + 1) * seg;
  return useTransform(progress,
    [start - seg * 0.25, start + seg * 0.1, end - seg * 0.1, end + seg * 0.25],
    [0, 1, 1, 0],
  );
}
```

Los 4 frames son **SVG/HTML inline** dentro de un phone mockup. Se super-
ponen con `absolute inset-0` y cross-fadean. Ventaja vs PNG real:
- No hay que re-exportar frames cada vez que cambia la UI
- Self-documenting — la UI del demo es código React, igual que la real
- Tamaño bundle: ~5 KB vs ~500 KB de PNGs

Indicador lateral de progreso: 4 dots, el activo crece y oscurece según
el `scrollYProgress`.

## WhyClickToEatSection — anatomía

Sección **editorial** con grid 5+7 (lg) — kicker + headline a la izquierda
(sticky en desktop), 4 cards a la derecha en grid 2x2.

Decisiones de diseño:
- **Sin background dark saturado.** Fondo blanco, dividers de `line`.
- **Numeración 01-04** en texto pequeño + spaced — referencia editorial.
- **Iconos en circulo bordeado** que cambia a `ink/30` on hover. No accent rojo permanente.
- **Headline con jerarquía gris**: la mitad del texto está atenuado para
  guiar la lectura sin saturar.
- **Hover trail**: línea inferior que aparece al pasar el cursor.

Scroll trigger por card con `delay: index * 0.08` (stagger natural sin
controller central). El headline hace parallax sutil (`y: 40 → -40`).

## SystemPreviewSection — anatomía

Texto a la izquierda con 4 features del panel + un browser mockup en SVG/HTML
a la derecha. El mockup hace parallax (`y: 60 → -60`) y `scale: 0.92 → 1.02`
sincronizado con el scroll del container.

El mockup imita visualmente el `/admin/pedidos`:
- Barra de browser (3 dots, URL)
- Sidebar con items
- Stats row (Hoy, Pedidos, Ticket)
- Tabla de últimos pedidos con estados de colores

No es interactivo. Sirve para que el dueño potencial sepa qué le espera
del lado del operador antes de registrarse.

## Local Card — la card del catálogo

La card de cada local (`LocalCard` en `DirectoryClient.tsx`) tiene varias
animaciones de hover y un layout pensado para no chocar elementos.

### Layout

```
┌────────────────────────────┐
│ [● Abierto]      [★]       │  ← badges top-left, star top-right
│ [↗ 1.2 km]                 │     (badges nunca colisionan con avatar)
│                            │
│       [Banner image]       │  ← h-44, scale 1 → 1.06 on hover (700ms)
│       (gradient bottom)    │
│                            │
│  (•) Avatar 14×14          │  ← overlap -mt-7, animación scale 0.85→1 entry
│                            │
│  Nombre del Local          │
│  tagline corto             │
│                            │
│  [9] [~30 min] [$ 20]      │  ← chips de stats con border
│                            │
│  📍 Dirección truncada     │
│                            │
│  ─────────────────────     │  ← divider
│  Ver menú             →    │  ← arrow doble: el primero sale, el segundo entra
└────────────────────────────┘
```

### Animaciones

- **Tilt 3D al hover**: `useMotionValue` para mouse X/Y, normalizado a [0,1].
  `useSpring` suaviza el seguimiento. `useTransform` mapea a `rotateX` ±3°
  y `rotateY` ±3°. `transformPerspective: 800px` da profundidad realista.

- **Spotlight que sigue al cursor**: `useMotionTemplate` construye un
  `radial-gradient(360px circle at <X>% <Y>%, rgba(255,45,45,0.10), transparent 50%)`
  que se renderiza en una capa absoluta sobre la card. Aparece on hover.

- **Banner zoom-in**: `scale: 1 → 1.06` con duración 700 ms y curva
  `cubic-bezier(0.2,0.8,0.2,1)`. Crea sensación cinematográfica.

- **Avatar entry**: `scale: 0.85 → 1, opacity 0 → 1` con delay 100 ms al
  montar la card. Hace que el avatar "se pose" tras el banner aparecer.

- **Lift y shadow**: `whileHover={{ y: -6 }}` + shadow más profundo
  `0_24px_60px_-30px_rgba(0,0,0,0.22)`.

- **Doble arrow en CTA "Ver menú"**: el primero sale hacia la derecha
  (`translate-x-6`), el segundo entra desde la izquierda (`translate-x-0`).
  Crea la sensación de "el icono se reemplaza".

### Bug arreglado (junio 2026)

El badge "Abierto" estaba en `bottom-3 left-3` del banner y el avatar
sobresalía con `-mt-10` desde el cuerpo. Ambos coincidían en la zona
inferior izquierda del banner — el badge tapaba al avatar.

Fix: badge movido a `top-3 left-3` (opuesto al star de favoritos). Avatar
movido a `-mt-7` con padding propio. Sin solapamiento.

## Convenciones para agregar una sección nueva

1. Crear archivo en `apps/web/src/components/landing/<Nombre>Section.tsx`
2. Si necesita scroll progress, usar `useScroll({ target: ref, offset: [...] })`
3. Animaciones de entrada con `whileInView` + `viewport={{ once: true, margin: '-80px' }}`
4. Mantener paleta sobria — accent solo en momentos específicos, no permanente
5. Importar en `DirectoryClient.tsx` y agregar al árbol JSX en el orden deseado
6. Documentar el cambio acá

## Paleta usada

Ver `globals.css` y `tailwind.config.ts`:

| Token | Valor light | Uso típico |
|-------|-------------|-----------|
| `--ce-ink` | `#0B0B0F` | Texto principal, ink en cards |
| `--ce-bg` | `#FAFAF7` | Fondo de página |
| `--ce-line` | `#E8E8E2` | Borders, dividers |
| `--ce-muted` | `#6B6B6B` | Texto secundario, kickers |
| `--ce-accent` | `#FF2D2D` | Accent rojo — usar con MEDIDA, no como background |

Regla: el accent rojo aparece en kicker icons, gradient-text, halos pulse.
**Nunca** como background grande, nunca como border permanente.
