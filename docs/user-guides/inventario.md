# Inventario

> Cómo controlar el stock de tus ingredientes y que el sistema descuente automáticamente cuando vendes.

## ¿Para qué sirve?

Sin inventario, vendes "a ojo". El owner se entera de que se acabó la tortilla cuando un cliente la pide.

Con inventario:
- El sistema **descuenta automáticamente** los ingredientes cuando vendes un producto.
- Te **avisa** cuando un ingrediente está por agotarse.
- Te muestra qué tienes y qué te falta.
- Permite reportes de costo de bienes vendidos (margen aproximado).

## Conceptos

### Ingrediente

Es la **materia prima** que compras: tortilla, carne, aceite, refrescos, vasos. Cada uno tiene stock medido en alguna unidad.

### Receta

Es la **lista de ingredientes que consume un producto**. Ejemplo:

```
Taco al Pastor (1 unidad) requiere:
  - 1 tortilla
  - 80 g carne al pastor
  - 30 g piña
  - 10 g cebolla
  - 10 g cilantro
```

Cuando vendes 1 taco al pastor, el sistema descuenta exactamente esas cantidades del stock.

### Movimiento de inventario

Cada cambio de stock se registra. Quién, cuándo, por qué (un pedido, un ajuste manual, una compra de proveedor).

Tienes el historial completo siempre disponible.

## Crear ingredientes

Menú lateral → **Inventario**.

"Nuevo ingrediente":

| Campo            | Ejemplo                       | Explicación                                |
|------------------|------------------------------|--------------------------------------------|
| Nombre            | "Tortilla de maíz"            | El que verás siempre.                        |
| Stock              | 200                          | Lo que tienes ahora mismo.                   |
| Stock mínimo      | 50                           | El sistema te alerta cuando bajes de esto.   |
| Unidad             | `pz` (pieza)                  | `pz`, `kg`, `g`, `l`, `ml`. Elige una y mantenla.|
| Costo unitario    | 0.80                         | Lo que te cuesta UNA tortilla.                |
| Activo             | ✅                            | Switch para "ocultar" sin borrar.            |

Click "Guardar".

## Cómo definir la unidad

| Producto típico               | Unidad recomendada           |
|------------------------------|------------------------------|
| Tortillas, vasos, latas        | `pz` (pieza)                  |
| Carnes, quesos                 | `kg`                          |
| Especias, salsas pequeñas      | `g`                            |
| Aceite, refrescos a granel     | `l`                            |
| Bebidas pequeñas (60ml, etc.)  | `ml`                           |

**Una vez elegida la unidad, no la cambies** — descuadraría toda la receta. Si te equivocaste, mejor crea un ingrediente nuevo.

## Crear recetas

Una receta vive **adentro de un producto**.

Menú lateral → **Productos** → click en el producto → tab "Receta" (o sección similar).

Por cada ingrediente que consume el producto:

- Click "Agregar ingrediente".
- Selecciona el ingrediente.
- Cantidad: cuánto consume **1 unidad** del producto.

Ejemplo Taco al Pastor:

| Ingrediente       | Cantidad                  |
|------------------|---------------------------|
| Tortilla de maíz  | 1 (pz)                     |
| Carne al pastor   | 0.080 (kg = 80 g)           |
| Piña               | 0.030 (kg)                  |
| Cebolla            | 0.010 (kg)                  |
| Cilantro           | 0.010 (kg)                  |

Guardar.

> Si decides que el taco lleve más carne, edita la cantidad. Aplica desde ese momento.

## Productos compuestos (combos)

Si tu producto es un **combo** que incluye otro producto que ya tiene su receta, puedes ahorrarte definir los ingredientes de nuevo:

Ejemplo: "Combo Familiar" tiene:
- 6 Tacos al Pastor (que ya tienen su receta).
- 1 Mix de Salsas (otro producto con receta propia).
- 1 Refresco familiar.

En la receta del "Combo Familiar":

- "Producto componente: Taco al Pastor — cantidad 6".
- "Producto componente: Mix de Salsas — cantidad 1".
- "Ingrediente directo: Refresco familiar — cantidad 1 pz".

Cuando vendes 1 Combo Familiar, el sistema **expande recursivamente**:

- 6 tacos = 6× (1 tortilla + 0.080 kg carne + ...) = 6 tortillas + 0.480 kg carne + ...
- 1 Mix de Salsas = (su propia receta).
- 1 Refresco.

Todo se descuenta del stock real correspondiente.

**No puede haber ciclos**: si el "Combo" se incluye a sí mismo (directa o indirectamente), el sistema lanza error al vender.

## ¿Qué pasa cuando vendes?

1. Llega un pedido → sistema lee la receta del producto.
2. **Bloquea** el stock momentáneamente (otros pedidos esperan).
3. Valida si hay suficiente.
4. Si **sí** → descuenta, registra el movimiento, libera el bloqueo.
5. Si **no** → cancela la operación, devuelve "stock insuficiente" al cliente.

> Si dos clientes piden el último taco al mismo tiempo: **uno gana**, el otro recibe "stock insuficiente". El que ganó descuenta. Cero duplicaciones, cero negativos.

## Cuando cancelas un pedido

Si cancelas un pedido que ya descontó stock → el sistema **devuelve automáticamente** los ingredientes.

Excepción: si ya estaba en "Entregado" y lo cancelas, **no devuelve** (el cliente ya consumió de facto).

## Alertas de bajo stock

Cuando un ingrediente **cruza** su `stock_minimo` (estaba arriba, ahora está al o por debajo), aparece una notificación en el panel (campanita arriba).

Mensaje tipo: `Bajo stock: Tortilla — Quedan 8 pz (mínimo: 10).`

> El sistema **no spammea**: si ya hay una notificación de "bajo_stock" no leída para ese ingrediente, no crea otra hasta que la marques como leída.

## Ajustes manuales

Hay momentos donde tu stock real no coincide con el del sistema:

- Conteo físico revela que tenías menos (alguien comió en cocina, se cayó al piso, etc.).
- Llegó una entrega que no registraste como compra formal.
- Mermaste por vencimiento.

Menú lateral → **Inventario** → click en el ingrediente → "Ajustar stock".

| Tipo       | Cuándo                                       | Cantidad                       |
|-----------|----------------------------------------------|-------------------------------|
| Entrada    | Sumar al stock (algo que llegó)              | Positiva                        |
| Ajuste     | Conteo físico ≠ sistema                      | Positiva (suma) o negativa (resta)|
| Merma      | Pérdida por daño/vencimiento                  | Negativa típicamente           |

Pon un **motivo** breve (es opcional pero te ayuda en auditoría).

El stock nunca baja de 0 — el sistema lo trunca.

## Historial

Click en un ingrediente → "Movimientos".

Lista paginada de todos los cambios: tipo, cantidad, stock resultante, referencia (pedido N / compra N / manual / alta), motivo, usuario que lo hizo, fecha.

Filtros: por tipo, por rango de fechas.

> Las filas se ordenan del más reciente al más viejo.

## Compras a proveedor

Cuando recibes mercancía del proveedor:

Menú lateral → **Compras** → "Nueva compra".

| Campo                | Para qué                                       |
|---------------------|------------------------------------------------|
| Proveedor            | Nombre del proveedor (opcional).                |
| Referencia factura    | # de factura o ticket.                          |
| Fecha                 | Cuándo llegó.                                    |
| Impuestos             | IVA si aplica.                                   |
| Notas                  | "Llegó parcial, faltan 5 kg de pollo".          |
| **Items**              | Lista de qué llegó:                              |
|                        | - Ingrediente.                                     |
|                        | - Cantidad.                                        |
|                        | - Costo unitario (lo que pagaste por unidad).      |

Click "Registrar".

Resultado:
- Cada ingrediente listado **sube** su stock.
- Su **costo unitario** se recalcula con promedio ponderado (tomas en cuenta lo que tenías + lo que llegó).
- Queda registro en historial con referencia `compra:N`.

### Anular una compra

¿Llegó mercancía equivocada y la regresaste? ¿Te confundiste al registrar?

Click en la compra → "Anular".

El sistema:
- Marca la compra como anulada.
- **Devuelve al stock anterior** los ingredientes que había sumado.
- Registra movimientos de salida con referencia `compra:N:anulacion`.

**Pero**: si ya se consumió parte de lo que registraste, no se puede anular (devolvería el stock a un negativo). El sistema te muestra "No se puede anular: parte del inventario ya se consumió" + qué ingrediente y cuánto.

Solución: ajusta manualmente el que sí se consumió y luego anula la compra.

## Borrar ingredientes

Sólo se puede borrar un ingrediente que **no esté en ninguna receta**. Si lo está, el sistema te dice "No se puede eliminar: hay productos con receta que lo usan".

Para borrar:
1. Quita el ingrediente de las recetas que lo usan.
2. Luego borra el ingrediente.

Como alternativa más segura: **desactiva** el ingrediente (switch "Activo" → off). Sigue existiendo en historial pero deja de contar.

## Tips de operación

- **Empieza simple**: 10-15 ingredientes con sus recetas. No intentes inventariar todo desde día uno.
- **Conteo físico semanal**: cada lunes cuentas físicamente y haces ajustes. Te ahorra deuda inventarial enorme.
- **Stock mínimo realista**: si vendes 50 tortillas al día y el proveedor te surte cada 3 días, tu stock_minimo debe ser ~150 (no 10).
- **Costo unitario actualizado**: cuando registres compras, pon el costo real. Tus reportes de margen dependen de esto.
- **No mezcles unidades**: si pones tortilla en `pz` pero la receta dice 0.5 kg, no cuadra. Usa la misma unidad consistente.

## Errores comunes

| Síntoma                                       | Causa                                              | Solución                                |
|----------------------------------------------|---------------------------------------------------|----------------------------------------|
| "Stock insuficiente" en un pedido público     | Receta + venta excede stock                        | Recibes mercancía, registras compra, o pones el producto "no disponible" mientras. |
| El stock no baja al vender                    | El producto no tiene receta                        | Crea la receta. (Sin receta, el sistema asume "no controlas inventario para este producto".) |
| Borré por error y reintegro no funciona       | Borrar el pedido no reintegra; cancelar sí.        | Restaura el pedido (contacta soporte) y cancélalo en lugar de borrar. |
| Costo unitario absurdo                        | Hace tiempo registraste mal una compra              | Ajuste manual del costo. (Pendiente endpoint dedicado — por ahora soporte.) |
| Conteo físico no coincide                     | Mermas / fugas no registradas                       | Ajuste manual de tipo "ajuste" con motivo claro. |
