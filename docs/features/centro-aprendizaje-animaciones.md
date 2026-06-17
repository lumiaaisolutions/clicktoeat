# Centro de aprendizaje con animaciones (sin videos)

Sección `/admin/centro-aprendizaje` para owners donde aprenden a usar
ClickToEat con **animaciones SVG/CSS** del propio sistema, sin necesidad
de grabar videos.

## Por qué animaciones en vez de videos

- **Mantenimiento**: cuando cambia la UI, los videos quedan desactualizados.
  Las animaciones SVG/CSS se renderizan con el código actual.
- **Performance**: SVG inline pesa < 5 KB. Un video MP4 a 720p pesa > 5 MB.
- **Accesibilidad**: las animaciones tienen alt-text y se pausan en
  `prefers-reduced-motion`.
- **Sin costo de producción**: cero grabación, cero edición, cero subtítulos.

## Cómo se construye cada lección

Cada lección es un componente React con:
1. **Título** + descripción corta
2. **Animación**: secuencia de frames CSS/SVG simulando los clicks del owner
3. **Pasos numerados** a la derecha
4. **CTA**: "Ir a hacerlo en mi panel" → link directo

Ejemplo de animación: "Cómo subir mi primer producto"
- Frame 1: sidebar resaltado → "Productos"
- Frame 2: aparece botón "+ Nuevo producto"
- Frame 3: form completándose (texto auto-typed)
- Frame 4: imagen drag&drop
- Frame 5: "Guardar" → checkmark

Implementación usando `framer-motion` con `motion.div` + `useEffect` para
ciclar los frames cada 2-3 segundos.

## Catálogo inicial de lecciones

1. **Cómo subir mi primer producto** — animación del flow de creación
2. **Cómo mover mi QR a la mesa** — animación del QR + impresión
3. **Cómo cobrar más en horario pico** — animación de cupones programados
4. **Cómo recibir pedidos con sonido** — animación del bell + push permission
5. **Cómo invitar a mi equipo** — animación de invitación + rol
6. **Cómo recuperar un producto borrado** — animación del filtro "borrados"

## Status

📅 **Pendiente de implementar UI** — esta es la documentación del plan.
La estructura está lista (`/admin/centro-aprendizaje` se agregará al NAV_OWNER).
Las animaciones SVG se irán construyendo una por una en próximas iteraciones.

## Plan de implementación (cuando se haga)

**Fase A** (1 día):
- Crear ruta `/admin/centro-aprendizaje/page.tsx`
- Layout con grid de cards
- Cada card abre un modal con la animación + pasos

**Fase B** (2-3 días):
- 6 animaciones SVG inline (una por lección)
- Cada animación es un `<motion.svg>` con keyframes definidos en JSON

**Fase C** (medio día):
- Tracking de cuáles lecciones ha visto el owner
- Badge "vista" en cards ya completadas
- Sugerencia automática "Sigue con: X" después de completar una
