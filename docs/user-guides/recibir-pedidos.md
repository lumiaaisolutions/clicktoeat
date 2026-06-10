# Recibir pedidos

> Cómo te llegan, cómo atenderlos paso a paso, qué significan los estados, qué hacer con cancelaciones.

## ¿Cómo te llega un pedido?

### El cliente

1. Entra a tu landing pública (`/tu-slug`).
2. Arma su pedido (productos + extras + cantidades).
3. Click "Confirmar pedido".
4. Llena: nombre, teléfono, dirección (si es delivery), método de pago.
5. Click "Enviar".

### El sistema

1. Crea el pedido en tu panel (estado: **Nuevo**).
2. Si el producto tiene receta, **descuenta del inventario** automáticamente.
3. Genera un mensaje pre-armado de WhatsApp.
4. Abre WhatsApp del cliente apuntando a TU número.

### Tu lado

1. Te llega un WhatsApp del cliente con su pedido completo (productos, total, dirección, método de pago, **folio** tipo `CE-AB12CD`).
2. Vas al panel → **Pedidos** → ves el mismo pedido como "Nuevo".

> Si te llega el WhatsApp pero **no aparece** en el panel: avisa a soporte. No suele pasar.

## El panel de pedidos

Menú lateral → **Pedidos**.

Verás todos los pedidos ordenados del más reciente al más viejo.

Filtros:
- Por **estado** (Nuevo, Confirmado, Preparando, etc.).
- Por **fecha** (en algunos casos).

Cada fila muestra: folio, hora, cliente, total, estado, método de entrega.

Click → ves el detalle: productos, extras, dirección, notas.

## Los estados

```
[Nuevo] → [Confirmado] → [Preparando] → [Listo] → [Entregado]
                                              ↓
                                         (si delivery)
                                              ↓
                                        [En camino] → [Entregado]

Cualquiera puede ir a → [Cancelado]
```

### Nuevo

Recién llegó. Aún no hiciste nada con él.

**Acción**: ver el detalle, confirmar al cliente que sí lo vas a preparar.

### Confirmado

Le dijiste al cliente "sí, va, en X minutos lo tienes". El sistema marca la hora de confirmación.

**Acción**: pon manos a la obra.

### Preparando

Está en la cocina / barra.

### Listo

Está listo para entrega o recoger.

**Acción** (según el método):
- Si es **pickup**: avisa al cliente "tu pedido está listo, ven por él".
- Si es **delivery**: pásalo a "En camino" cuando el repartidor salga.
- Si es **sucursal** (pedido de mostrador hecho en el local): márcalo "Entregado" cuando ya pagó y se lo lleva.

### En camino

Sólo para delivery. El repartidor salió.

### Entregado

Cerrado, exitoso. El sistema marca la hora de entrega.

### Cancelado

El pedido no se va a hacer. Razones:
- Cliente arrepentido.
- Sin stock.
- Local cerrado.
- Cliente no localizable.

**Cuando cancelas un pedido**: el sistema automáticamente **devuelve al stock** los ingredientes que ya se habían descontado. Esto es importante — no tienes que ajustar nada manualmente.

> Excepciones: si el pedido ya estaba en estado `Entregado` y lo cancelas (raro), **no** reintegra (porque se entiende que el cliente sí lo consumió).
>
> Si cancelas dos veces (clickeas mal y vuelve a pedir cancelar), no duplica el reintegro — es a prueba de errores.

## Cómo cambiar de estado

Click en un pedido → botón "Cambiar estado" → seleccionar el nuevo → confirmar.

O desde la lista: hay accesos rápidos para "Confirmar" / "Listo" / "Entregado".

## El flujo típico (sin delivery)

```
Llega WhatsApp ───► Panel: pedido nuevo
       │
       ▼
"¡Hola! Sí, lo confirmamos. Está listo en 20 min."
       │
       ▼
Panel: cambiar a "Confirmado"
       │
       ▼ (cocinas)
Panel: cambiar a "Preparando" (opcional, si quieres trazabilidad fina)
       │
       ▼ (lo terminas)
Panel: cambiar a "Listo"
WhatsApp al cliente: "Tu pedido está listo, te esperamos."
       │
       ▼ (cliente llega y paga)
Panel: cambiar a "Entregado"
```

## El flujo típico (con delivery)

```
Llega WhatsApp ───► Panel: pedido nuevo
       │
       ▼
"¡Hola! Sí, va. Llega en 35 min aprox."
       │
       ▼
Panel: cambiar a "Confirmado"
       │
       ▼ (cocinas)
Panel: cambiar a "Preparando" → "Listo"
       │
       ▼ (sale el repartidor)
Panel: cambiar a "En camino"
WhatsApp al cliente: "Ya va en camino tu pedido."
       │
       ▼ (repartidor entrega)
Panel: cambiar a "Entregado"
```

## El flujo en el POS interno (cliente que entra al local)

Hay un módulo separado: **Punto de venta**.

1. Menú lateral → **Punto de venta**.
2. Vista de productos por categoría.
3. Click en cada producto que el cliente quiere; arma el carrito en pantalla.
4. Selecciona método de pago (efectivo / tarjeta TPV / tarjeta a entrega / transferencia).
5. Click "Cobrar".
6. Se crea el pedido como `metodo_entrega=sucursal` y **se marca confirmado automáticamente** (el cliente ya está pagando).
7. Descuenta inventario igual que un pedido público.
8. Imprime ticket (cuando exista esa función — pendiente).

> El POS NO genera URL de WhatsApp (el cliente está físicamente ahí).
>
> El POS **sí descuenta inventario**.
>
> El POS **puede vender fuera de horario** (porque ya hay alguien físicamente atendiendo). Los pedidos públicos se rechazan fuera de horario.

## Notificaciones

En el panel, esquina superior, hay una **campanita** que muestra:

- Pedidos nuevos (los que aún no has visto).
- Alertas de **bajo stock** (cuando un ingrediente baja del umbral).

El panel revisa cada 30 segundos por nuevos avisos. Si tienes el panel abierto en una pestaña, las verás aparecer automáticamente.

> Por ahora **no llega notificación push al celular**. Está pendiente (Fase 6 del roadmap).
> Como buen workaround: el WhatsApp del cliente te llega siempre. Esa es tu notificación más confiable.

## Cancelaciones del cliente

Si el cliente te escribe por WhatsApp "ya no lo quiero":

1. Ve al pedido en el panel.
2. Cambia a "Cancelado".
3. Confirma.

El sistema:
- Marca el pedido como cancelado.
- Devuelve al stock los ingredientes consumidos.
- Lo dejas registrado para auditoría.

## Cancelaciones de tu lado (sin stock, problema, etc.)

Igual: cambia a "Cancelado". **Avísale al cliente** por WhatsApp.

## Pedidos que no se entregan (cliente no responde / no llega)

Misma acción: "Cancelado". Si quieres anotar la razón, en el detalle del pedido hay un campo "Notas" donde puedes registrar.

## Búsqueda y filtros

En la lista de pedidos:
- Filtro por estado para enfocarte en los activos ("Nuevo", "Confirmado", "Preparando", "Listo", "En camino").
- Búsqueda por código (`CE-XXXXXX`) si te pasan el folio.

## Histórico

Todos los pedidos quedan en el sistema indefinidamente (salvo cancelación expresa del cliente bajo ARCO).

Las **métricas** del panel los agregan: ventas, ticket promedio, productos más pedidos. Ver [`metricas.md`](metricas.md).

## Errores comunes

| Síntoma                                                | Causa                                       | Solución                                |
|--------------------------------------------------------|---------------------------------------------|----------------------------------------|
| "Stock insuficiente" cuando llega un pedido público     | La receta del producto descuenta más de lo que hay | Ajusta inventario o agrega ingrediente. Ver [`inventario.md`](inventario.md). |
| El cliente dice que no le abre WhatsApp                 | Cliente no tiene WhatsApp instalado, o tu número no es válido. | Confirma con cliente. Verifica el número en Branding. |
| El total no cuadra                                      | Cliente eligió extras con precio extra que se sumaron | Es comportamiento esperado. El mensaje de WhatsApp lo detalla. |
| Quiero marcar varios pedidos a la vez                   | No soportado hoy                            | Pendiente (bulk actions). |
| Borré un pedido por error                                | Es soft-delete                              | Contacta soporte para restaurar.        |

## Tips operativos

- **Confirma rápido** al cliente. Un "Recibido, va" en los primeros 2 min reduce cancelaciones.
- **Usa los estados en orden** — te ayuda a tener trazabilidad si el cliente reclama "¿dónde está mi pedido?".
- **Cierra el día** revisando que todos los pedidos quedaron en "Entregado" o "Cancelado" (sin colgados en "Confirmado" o "Listo").
- **Avisar pickup**: cuando pones "Listo", manda un WhatsApp al cliente: "Tu pedido CE-XXXX está listo, te esperamos."
- **Tiempo es venta**: cliente que espera > 30 min sin update cancela. Si vas a tardar, avisa.
