# UI nueva (junio 2026): cupones horario, reviews, centro de aprendizaje

Cuatro features de UI que completan el trabajo backend que ya estaba listo.

## 1. Form de cupones con horario + destacar en landing

`/admin/cupones` → modal de crear/editar cupón ahora tiene 2 secciones nuevas:

### Sección "Horario (opcional)"
- Hora desde / hasta (selectores `type="time"`)
- 7 botones para días de semana (L M X J V S D) con toggle multi-selección
- Si vacíos: el cupón aplica siempre que esté `activo`

### Sección "Mostrar como banner en mi landing pública"
- Switch que al activarse muestra un selector de productos
- Lista checkbox de productos del local
- Al guardar: si está activo + tiene productos, el banner aparece en
  la landing con botón "Aprovechar" que agrega esos productos al carrito.

Backend ya aceptaba estos campos vía `CuponController@validateData` (F100).

## 2. Banner de cupón destacado en landing

`apps/web/src/components/landing/CuponDestacadoBanner.tsx` — sticky top
amber/orange en `/{slug}`. Consume `GET /public/cupones/{slug}/destacados`
(que filtra por horario en runtime).

Comportamiento:
- Aparece solo si hay cupones destacados activos en el momento
- Refresca cada 5 minutos por si cambia el horario
- Botón "Aprovechar" → agrega productos sugeridos al carrito + setea
  `cart.coupon = codigo`
- Dismissable per-cupon-id en localStorage

Store cart: agregado `coupon: string | null` + `setCoupon(code)` que
se persiste con el resto del cart.

## 3. Página `/admin/reviews` para moderar calificaciones

Owner ve todas sus reviews con filtros:
- Todas
- Sin calificar (link enviado, esperando que el cliente conteste)
- Aprobadas (visibles en landing)
- Ocultas (des-aprobadas por el owner)

Acciones:
- Para reviews con rating>0: botón "Aprobar" / "Ocultar"
- Para reviews pendientes (rating=0): botón "Copiar link"

Endpoint backend (NUEVO):
- `GET /api/v1/admin/reviews` → lista del local del owner (filtra por
  tenant scope)
- `PATCH /api/v1/admin/reviews/{review}/toggle` → flip `aprobado`

## 4. Botón "Link de calificación" en `/admin/pedidos`

Cuando un pedido está en estado `entregado`, aparece un chip ámbar
"⭐ Link de calificación" en la fila. Click copia al portapapeles el link
`https://clicktoeat.lumiaaisolutions.com/review/{token}` para que el
owner lo mande al cliente por WhatsApp.

(El Review con token se creó automáticamente cuando el owner marcó el
pedido como entregado — eso ya estaba implementado.)

## 5. Centro de aprendizaje con animaciones SVG

`/admin/centro-aprendizaje` con 6 lecciones. Cada una abre un modal con:
- Animación SVG inline (framer-motion) que repite en loop ~3s
- Resumen de pasos numerados
- Botón directo al módulo (`/admin/productos`, `/admin/cupones`, etc.)

Lecciones implementadas:
1. **Cómo subir mi primer producto** — anim del flow de creación
2. **Cómo imprimir y pegar mi QR** — anim del QR animado
3. **Cómo cobrar más en horario pico** — anim de reloj + cupón emergiendo
4. **Cómo recibir pedidos con sonido** — anim de campana vibrando
5. **Cómo invitar a mi equipo** — anim de avatares apareciendo (cocina, caja, mesero)
6. **Cómo recuperar un producto borrado** — anim de basura → restore

Sin assets externos. Todo SVG en código. Pesa < 10KB total.

Sidebar: agregada entry "Aprende a usar" (icono sparkles) entre
"Suscripción" y "Centro de ayuda".

## POS offline

**Ya estaba implementado** con `lib/pos-offline.ts` + `OfflineBanner`
usando localStorage. Verificado funcionando en `/admin/punto-venta`.

No se modificó nada para evitar regresiones — el sistema existente
maneja:
- Detección de online/offline
- Cola de pedidos pendientes en localStorage
- Auto-sync cuando vuelve internet
- Botón "Sincronizar ahora" manual
- Mensaje al user cuando 409 idempotency conflict

## Rutas nuevas (resumen)

Backend:
- `GET  /api/v1/public/cupones/{slug}/destacados` (F100)
- `GET  /api/v1/public/reviews/local/{slug}` (F100)
- `GET  /api/v1/public/reviews/token/{token}` (F100)
- `POST /api/v1/public/reviews/token/{token}` (F100)
- `GET  /api/v1/admin/reviews` (F100, en grupo tenant)
- `PATCH /api/v1/admin/reviews/{review}/toggle` (F100)

Frontend:
- `/{slug}/review/[token]` — cliente califica
- `/admin/reviews` — owner modera
- `/admin/centro-aprendizaje` — lecciones con animaciones
