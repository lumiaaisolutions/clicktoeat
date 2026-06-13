# Frontend — Secciones modulares de la home

> Componentes en `apps/web/src/components/landing/`. Cada sección es una
> unidad autónoma con su propio scroll trigger, animación y datos hardcoded.
>
> Se ensamblan desde `DirectoryClient.tsx`. Si se reordenan, no se rompe
> nada — cada sección es independiente.

## Inventario

| Archivo | Propósito | Animación característica |
|---------|-----------|--------------------------|
| `ScrollPhoneSequence.tsx` | Demostración visual del flujo del cliente en 4 frames | Image-sequence scrubbing (estilo Apple) |
| `WhyClickToEatSection.tsx` | 4 razones por las que el producto existe | Editorial — números 01-04, scroll fade staggered, headline sticky |
| `SystemPreviewSection.tsx` | Browser mockup del panel admin + texto explicativo | Parallax y scale del mockup |

`CTAOwnerSection`, `ShareQRSection`, `Footer` y `Hero` siguen viviendo en
`DirectoryClient.tsx` porque son co-dependientes con su estado local
(`url` del QR, `userCoords`, etc.).

## ScrollPhoneSequence — anatomía

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
