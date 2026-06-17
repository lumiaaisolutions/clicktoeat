# Fixes pedidos / reviews / fuentes / landing — 2026-06-17 (tarde 2)

7 mejoras en una pasada.

## 1. Link de calificación arrojaba 429 (Too Many Attempts)

**Antes**: el botón "Link de calificación" en `/admin/pedidos` hacía
`GET /admin/reviews` cada click → endpoint con throttle → al pulsarlo
3 veces se rompía con 429.

**Ahora**:
- `PedidoResource` incluye `review_token` directamente (subquery 1x al
  cargar la lista). Sin llamadas extra al hacer click.
- Click abre un modal con 3 opciones: **Abrir WhatsApp del cliente**
  (deeplink `wa.me/{tel}?text=...`), **Copiar solo el link**, y vista
  previa del mensaje.

## 2. WhatsApp automático para el link de calificación

**Nuevo**: el modal genera un mensaje pre-llenado tipo:

> "Hola {nombre} 👋 ¡Gracias por tu pedido en nuestro local!
> Nos encantaría saber qué te pareció. Califícanos en 30 segundos aquí:
> {link}"

Y arma `https://wa.me/{telefono_sin_caracteres}?text={mensaje_url_encoded}`
para que el owner toque "Abrir WhatsApp" y caiga directo en el chat del
cliente con el mensaje listo para mandar.

## 3. Botón "Cambiar estado" en cada fila del pedido

**Antes**: para cambiar el estado había que abrir el modal de detalle
(click en la fila completa).

**Ahora**: chip rápido "⚙ Cambiar estado" en cada pedido NO terminal
(no entregado/cancelado). Click abre el modal directo en modo edición.

## 4. Retroceder estado del pedido (deshacer error)

**Antes**: si el owner avanzaba el pedido a "entregado" por error, no
había forma de regresarlo. La transición era unidireccional.

**Ahora**: el modal del pedido muestra dos secciones:
- **Avanzar**: flujo normal (botones `→ confirmado`, `→ preparando`, …)
- **¿Te equivocaste?**: botones `← preparando`, `← listo`, etc. con
  `confirm()` antes de aplicar.

Mapeo en `TRANSICIONES_ATRAS`:
```
entregado → en_camino, listo
en_camino → listo
listo → preparando
preparando → confirmado
confirmado → nuevo
cancelado → nuevo
```

## 5. Botón borrar reseña

**Antes**: solo se podía Aprobar / Ocultar. Una reseña ofensiva quedaba
en la BD para siempre.

**Ahora**: cada review tiene un botón rojo "Borrar" con confirmación.
Backend: nuevo endpoint `DELETE /api/v1/admin/reviews/{review}` que
elimina definitivamente.

Útil para spam, contenido ofensivo, o pruebas que se quieren limpiar.

## 6. Tipografía del branding aplicada a más elementos del landing

**Antes**: la fuente configurada por el owner solo afectaba a "Lo más
pedido hoy" (único elemento con clase `.ce-display`). El nombre del
local, títulos de productos, sección "Confirma tu pedido", footer, etc.
usan `.ce-serif` (que estaba hardcoded a Instrument Serif).

**Ahora**: CSS global tiene regla nueva:
```css
.ce-warm .ce-serif {
  font-family: var(--ce-display-font, "Instrument Serif"), "Georgia", serif;
}
```

`.ce-warm` es el wrapper de la landing pública del local. Dentro de
ese scope, `.ce-serif` también respeta la tipografía custom. Fuera
(admin), `.ce-serif` queda como estaba.

Resultado: cambiar la fuente en `/admin/branding` ahora se refleja en
TODOS los títulos del landing (nombre, productos, carrito, checkout,
footer, etc.).

## 7. Botón "Ver más restaurantes en ClickToEat" en footer del local

**Antes**: el visitante de la landing de un local no tenía cómo regresar
al directorio principal.

**Ahora**: footer dark del local tiene al final un botón outline blanco
"🏪 Ver más restaurantes en ClickToEat → arrow" que abre
`https://clicktoeat.lumiaaisolutions.com/` en nueva tab.

## 8. "Lo más pedido hoy" rebalanceado (de nuevo)

**Antes (sesión previa)**: convertido a lista vertical muy compacta, el
user dijo que era demasiado pequeño.

**Ahora**: vuelto a grid de 3 cards horizontales con thumb cuadrado
(igual que la versión original) pero compacto:
- padding p-4 (era p-2)
- thumb aspect-square legible
- texto producto text-xs/text-[13px]
- badge #1/#2/#3 visible en esquina

Visible y proporcionado vs las cards de producto de abajo.

## Tests + build

185/185 phpunit verde, TypeScript estricto OK, Next.js build OK.
