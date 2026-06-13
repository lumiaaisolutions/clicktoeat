# Frontend — Patrones de animación scroll

> Convenciones para animaciones disparadas por scroll en el directorio público
> y secciones de marketing. Stack: `framer-motion` 11.x.
>
> Para animaciones del **panel admin**, usar transitions más sutiles —
> el contexto es operativo, no marketing.

## Tres patrones canónicos

### 1. Entrada en viewport (la mayoría de cards)

```tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
>
```

Reglas:
- **`once: true`** — la animación NO se repite al salir/entrar. Evita ruido.
- **`margin: '-80px'`** — el viewport "se siente" más estricto. La card está bien
  visible antes de animarse, no se anima justo al asomar.
- **`delay: i * 0.08`** en listas — stagger natural sin coordinador central.
- **Easing custom `[0.2, 0.8, 0.2, 1]`** — curva más decisiva que `easeOut`.

### 2. Parallax (headlines, mockups)

```tsx
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start end', 'end start'],
});
const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

<motion.div style={{ y }} ref={ref}>…</motion.div>
```

Reglas:
- Rango pequeño (`±40px` a `±60px`) — el parallax debe ser sentido, no notorio.
- `offset: ['start end', 'end start']` mide desde que el container *empieza
  a entrar* hasta que *termina de salir*.
- Combinable con `scale` ligero (`0.92 → 1` → `1.02`) para sensación de respiración.

### 3. Scrubbing (image-sequence)

Usado en `ScrollPhoneSequence.tsx`. Container alto (~3-4x viewport),
sticky inner, frames superpuestos con cross-fade controlado por
`scrollYProgress`.

```tsx
const { scrollYProgress } = useScroll({
  target: containerRef,
  offset: ['start start', 'end end'],
});

function frameOpacity(progress, idx, total) {
  const seg = 1 / total;
  const start = idx * seg;
  const end   = (idx + 1) * seg;
  return useTransform(progress,
    [start - seg * 0.25, start + seg * 0.1, end - seg * 0.1, end + seg * 0.25],
    [0, 1, 1, 0],
  );
}
```

El "barrido" se siente porque varios frames pueden tener opacity > 0 en la
zona de transición — crossfade real, no swap.

## 4. Mouse parallax / tilt 3D (cards)

Usado en `LocalCard`. Captura la posición del cursor relativa a la card
y mapea a `rotateX`/`rotateY` con `useSpring` para suavizar.

```tsx
const mouseX = useMotionValue(0.5);
const mouseY = useMotionValue(0.5);
const smoothX = useSpring(mouseX, { stiffness: 200, damping: 25 });
const smoothY = useSpring(mouseY, { stiffness: 200, damping: 25 });

const rotateX = useTransform(smoothY, [0, 1], [3, -3]);
const rotateY = useTransform(smoothX, [0, 1], [-3, 3]);

<motion.article
  style={{ rotateX, rotateY, transformPerspective: 800 }}
  onMouseMove={(e) => {
    const rect = ref.current!.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }}
  onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
>
```

Reglas:
- **`transformPerspective: 800`** es el sweet spot. Menos = caricaturesco,
  más = invisible.
- **Rotación máxima ±3°** — más se siente nervioso, menos no se nota.
- **Spring damping 25** — sin spring el cursor "salta" de un valor a otro.

## 5. Spotlight (`useMotionTemplate`)

Capa decorativa que sigue al cursor sin re-renderizar React:

```tsx
const spotlightX = useTransform(smoothX, (v) => `${v * 100}%`);
const spotlightY = useTransform(smoothY, (v) => `${v * 100}%`);
const spotlight = useMotionTemplate`
  radial-gradient(360px circle at ${spotlightX} ${spotlightY},
    rgba(255,45,45,0.10), transparent 50%)
`;

<motion.span style={{ background: spotlight }} />
```

`useMotionTemplate` interpola motion values en un template string sin pasar
por el ciclo de render de React. Performance: el GPU compone solo, sin
forzar repaint de toda la card.

## 6. Counter (Intersection Observer + rAF)

`CountUp` en el hero. Cuenta de 0 al valor objetivo cuando entra al viewport.

```tsx
useEffect(() => {
  const obs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !started) setStarted(true);
  }, { threshold: 0.3 });
  obs.observe(ref.current);
}, []);

useEffect(() => {
  if (!started) return;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / (duration * 1000));
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    ref.current.textContent = String(Math.round(to * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}, [started, to]);
```

Por qué no `useState` con setInterval:
- Re-renderiza React 60×/seg — desperdicio.
- `node.textContent = ...` muta directamente el DOM, sin reconciliación.

## Lo que NO hacemos

- **`whileInView` con `once: false`** — la animación se redispara al hacer
  scroll arriba y abajo. Distrae.
- **Animar `height` o `width`** en scroll — performance pésima. Usar
  `scale` o `transform`.
- **Animar más de 3 propiedades a la vez** en una sola transición. Si necesitas
  4+, separa en motion children.
- **Loaders/spinners** dentro de secciones de marketing — el loader global
  ya cubre eso (ver [`loaders.md`](./loaders.md)).
- **Parallax sin `useScroll({ target })`** — sin target, el progreso es global
  y no responde a la posición de la sección. Resultado: todo se mueve a la
  vez, sensación rota.

## Acessibilidad

Las animaciones de marketing actuales NO respetan `prefers-reduced-motion`.
Esto es un **TODO** (no crítico para MVP). Cuando se aborde:

```tsx
import { useReducedMotion } from 'framer-motion';

const reduce = useReducedMotion();
const variants = reduce
  ? { initial: false, animate: false }
  : { initial: { opacity: 0 }, animate: { opacity: 1 } };
```

Aplicarlo en `Hero`, `ScrollPhoneSequence` (es el más agresivo) y
`SystemPreviewSection`.

## Performance

- Cada `useScroll` y `useTransform` agrega watchers. Limítelo a 1 por sección.
- Los frames de `ScrollPhoneSequence` son **SVG/HTML**, no PNGs — no hay
  network ni decodificación.
- Si en el futuro se introducen videos auto-play, considerar
  `IntersectionObserver` para pausar fuera del viewport.

## Ver también

- [`landing-sections.md`](./landing-sections.md) — Componentes que usan estos patrones
- [`loaders.md`](./loaders.md) — Sistema de loaders (no es scroll, pero relacionado)
