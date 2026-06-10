# Métricas

> Cómo leer tu dashboard de ventas y entender qué te dice de tu negocio.

## ¿Dónde están?

Menú lateral → **Métricas**.

## Periodos predefinidos

Arriba hay un selector de **periodo**:

- **Hoy** — desde las 00:00 hasta ahora.
- **Ayer** — todo el día de ayer.
- **7 días** — los últimos 7 días.
- **30 días** — los últimos 30 días (default cuando entras).
- **Este mes** — desde el 1° hasta hoy.

O selector custom: **Desde** / **Hasta** para definir un rango.

## Las 7 secciones

### 1. Resumen (KPIs)

Las tarjetas grandes:

| Tarjeta             | Qué significa                                                        |
|--------------------|----------------------------------------------------------------------|
| **Pedidos**         | Cuántos pedidos se hicieron en el periodo (sin contar cancelados).     |
| **Ventas totales**  | Suma del total de todos los pedidos del periodo.                       |
| **Ticket promedio** | Ventas totales ÷ pedidos. Cuánto deja cada pedido en promedio.          |
| **Ingresos por envío** | Suma de las tarifas de delivery cobradas.                           |
| **Costo de compras** | Lo que gastaste en mercancía registrada en el periodo (de tu módulo Compras). |
| **Margen aproximado** | Ventas − costo de compras.                                           |
| **Margen %**         | Qué % de las ventas se queda como margen.                              |
| **Bajo stock**       | Cuántos ingredientes están al límite o por debajo (snapshot ACTUAL — no del rango). |

> **Importante sobre el margen**: es **aproximado**. Suma las compras del periodo aunque no se hayan vendido todavía (sumas inventario que se queda en bodega). Útil para tener un pulso, no para contabilidad fina.

### 2. Pedidos por estado

Un desglose: cuántos están "Nuevo", cuántos "Entregado", "Cancelado", etc.

Útil para:
- Detectar **pedidos colgados** ("Confirmado" que llevan días sin pasar a "Entregado").
- Ver tu **tasa de entrega exitosa** (entregado vs cancelado).

### 3. Pedidos por método de entrega

| Método      | Significa                            |
|------------|--------------------------------------|
| Pickup      | El cliente vino a recoger.            |
| Delivery    | Llevaste con tu repartidor.            |
| Sucursal    | Venta presencial vía POS (caja).       |

Cantidad + monto por cada uno. Te dice qué canal está jalando más.

### 4. Pedidos por método de pago

Efectivo / Tarjeta a la entrega / Tarjeta TPV / Transferencia.

Útil para:
- Saber cuánto efectivo manejas (riesgo de robo).
- Saber cuánto te debe la procesadora de tarjeta.
- Detectar fraude (mucho "tarjeta a la entrega" puede esconder devoluciones).

### 5. Serie diaria

Gráfica de barras o líneas: pedidos y ventas día por día.

Patrones que verás:
- **Estacionalidad semanal**: viernes/sábado fuertes, lunes flojo.
- **Picos** por publicidad o evento (compártelo con el equipo).
- **Caídas** que pueden ser tu local cerrado, alguna falla, o estacionalidad.

Si un día tiene 0 pedidos, en la gráfica aparece como una barra en 0 (no como un "salto") — para que veas el hueco claramente.

### 6. Top productos

Lista de los **10 productos más vendidos** en el periodo, ordenados por cantidad.

Por cada uno:
- Nombre del producto.
- Cantidad vendida.
- Ingresos generados.
- En cuántos pedidos apareció.

Útil para:
- **Optimizar tu menú**: los productos del top se merecen mejor foto/descripción/posición.
- **Eliminar lo que no se vende**: si un producto no aparece en el top en 30 días, considera ajustarlo o quitarlo.
- **Negociar con proveedores**: el ingrediente del producto top merece descuento por volumen.

> Los productos se agrupan por **nombre snapshotteado**. Si renombraste un producto, los pedidos viejos siguen como el nombre viejo (no se mezclan con el nuevo). Esto es a propósito — más fiel a tu histórico.

### 7. Estado de inventario

Cuántos ingredientes están en **bajo stock**. Click para ir directo a la lista.

## Cómo usar el dashboard según el momento

### Inicio del día

- Revisa el resumen de "Ayer".
- Cuántos pedidos, cuánto vendiste, ticket promedio.
- Si hay un patrón raro (pico o caída), investiga.

### Mitad del día

- Revisa "Hoy".
- ¿Va al ritmo del promedio del mismo día de la semana pasada?
- Si está bajo, considera: promo, push en redes, etc.

### Cierre del día

- "Hoy" — total de ventas para tu cuadre.
- Pedidos por método de pago para cuadrar caja.
- Estado de inventario: ¿tengo lo que necesito para mañana?

### Cada lunes

- "7 días" — ¿cómo te fue la semana?
- Top productos — ¿algo cambió?
- Margen — ¿se mantiene saludable?

### Cada inicio de mes

- "Este mes" o "30 días" — pulso del periodo.
- Comparar con el mes anterior (mentalmente — comparativa automática es pendiente).
- Decisiones de mediano plazo: ¿cambio el menú? ¿subo precios? ¿negocio con proveedor?

## Interpretar el margen

Si tu margen aproximado es:

- **70-80%** — saludable para comida con preparación simple.
- **50-65%** — normal para platillos elaborados.
- **< 40%** — algo está mal: precios muy bajos, costos muy altos, mucha merma.
- **> 90%** — sospechoso: probablemente no registraste compras del periodo.

> Recuerda que el margen aproximado **no descuenta**:
> - Renta del local.
> - Sueldos.
> - Servicios (luz, agua, gas, internet).
> - Comisiones (tarjetas, repartidores).
> - Impuestos.
>
> Tu margen real es menor.

## Limitaciones actuales

- **Sin comparativa periodo anterior** — no te dice "+10% vs semana pasada". Próximamente.
- **Sin filtrado por categoría** en top productos.
- **Sin export a Excel/PDF** desde el panel. Por ahora, copia manual.
- **Sin métricas por staff** (quién atendió cuántos pedidos en POS).
- **Zona horaria**: usa la zona horaria del servidor, no necesariamente la tuya. Si estás fuera de México Central, los rangos por "preset" pueden tener offset de horas.

Pendientes para próximas versiones — ver [`../issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).

## Errores comunes

| Síntoma                                | Causa                                            | Qué hacer                                 |
|---------------------------------------|--------------------------------------------------|-----------------------------------------|
| "Sin local asignado"                  | El usuario no tiene local vinculado               | Contacta soporte.                        |
| Métricas vacías a pesar de ventas      | Filtros mal — verifica el rango de fechas         | Cambiar el preset / fechas.              |
| Margen negativo                        | Registraste compras y no vendiste nada de eso    | Normal si la compra fue reciente.         |
| Top productos mezcla "Taco" y "Tacos"  | Renombraste el producto                          | Es comportamiento esperado (snapshot).    |
| Bajo stock cuenta cosas que ya repusiste | El número es snapshot actual — si ya repusiste, se actualiza | Recarga la página.                |

## Tips

- **Revisa diario, decide semanal, ajusta mensual**.
- Si tu ticket promedio cae sostenidamente, revisa los productos del top: ¿les bajaste el precio? ¿hay promociones que reducen ticket?
- Si los pedidos suben pero las ventas no proporcionalmente, ticket promedio bajó — investiga.
- Si el % de cancelaciones sube, hay un problema operativo (tardas mucho, errores en preparación, comunicación con cliente).
- Si delivery domina pickup, considera subir delivery_fee o sumar más promociones de pickup (mejor margen).
