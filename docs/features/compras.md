# Feature — Compras a proveedor

## Qué resuelve

Registrar mercancía recibida del proveedor → sube stock + actualiza costo promedio ponderado + deja huella en `movimientos_inventario` + permite anularla en bloque si fue un error.

`App\Services\Compras\CompraService`.

## Tablas

- `compras`: cabecera (proveedor, fecha, totales, estado).
- `detalle_compras`: líneas (`ingrediente_id`, cantidad, costo_unitario, subtotal).

Códigos legibles: `CP-XXXXXX`.

## Flujo: registrar compra

`POST /api/v1/compras`. Body:

```json
{
  "proveedor": "Distribuidora Hermanos",
  "referencia_factura": "F-0012",
  "fecha": "2026-06-10",
  "impuestos": 80,
  "notas": "Llegó parcial: nos deben 5 kg",
  "items": [
    { "ingrediente_id": 5, "cantidad": 20,    "costo_unitario": 12.5 },
    { "ingrediente_id": 7, "cantidad": 4.500, "costo_unitario": 18.0 }
  ]
}
```

Validación: `Compra/StoreCompraRequest`.

### Lógica `CompraService::registrar`

1. Verifica que todos los `ingrediente_id` pertenezcan al local. Si no, `RuntimeException`.
2. `lockForUpdate` sobre los ingredientes (sólo MySQL).
3. Calcula totales: `subtotal = Σ cantidad × costo`, `total = subtotal + impuestos`.
4. Crea `Compra` (estado `registrada`).
5. Por cada item:
   - Crea `DetalleCompra`.
   - Actualiza el ingrediente:
     - `stock += cantidad`
     - `costo_unitario` → **promedio ponderado**:
       ```
       nuevo = (stockAntes × costoAntes + cantidad × costoCompra) / (stockAntes + cantidad)
       ```
       Si `stockTotal <= 0` → usa `costoCompra`.
       Redondeado a 2 decimales.
   - Crea `MovimientoInventario` (tipo `entrada`, ref `compra:N`).

Todo dentro de `DB::transaction`.

## Flujo: anular compra

`DELETE /api/v1/compras/{id}` → `CompraService::anular`.

1. Idempotente: si ya está `anulada`, return.
2. Carga detalles + ingredientes (lockForUpdate).
3. **Valida que el stock actual ≥ cantidad comprada** por cada ingrediente. Si alguno falla → `CompraNoReversibleException(faltantes)` → 409.
   - Razón: si ya vendiste parte de esa entrada, no puedes "des-comprarla".
4. Por cada item:
   - `stock -= cantidad`.
   - Crea `MovimientoInventario` (tipo `salida`, ref `compra:N:anulacion`).
5. Marca compra `estado='anulada'`.

### Lo que NO hace la anulación

- **No restaura el `costo_unitario` anterior.** Calcular el costo previo a la compra requeriría recordar el estado antes, y matemáticamente el promedio ponderado no es reversible una vez que hubo otras compras o ajustes. Solución: si el costo queda mal, el owner puede pedir un ajuste manual.

## Costo promedio ponderado — por qué

Mantener un costo unitario realista por ingrediente para que las métricas (margen, costo de bienes vendidos) sean creíbles. Sin esto, dejar el costo de la última compra ignora las compras anteriores.

Ejemplo:
- Stock previo: 10 kg de tomate @ $20/kg → inversión $200.
- Compras 5 kg @ $30/kg → inversión nueva $150.
- Total: 15 kg → $350.
- Nuevo costo unitario: `350/15 = $23.33`.

## Filtros y listado

`GET /api/v1/compras`:
- `?estado=registrada|anulada`
- `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`
- `?per_page=20` (max 100)
- Default: orden `fecha DESC, id DESC`.

## Política

`CompraPolicy::before` → super_admin pasa.
- `viewAny`: cualquier usuario del local.
- `view`: mismo local.
- `create`: owner **o** staff (staff puede registrar lo que llega).
- `delete` (anular): **sólo owner**.

## Limitaciones

- Sin **pago al proveedor** (`pagada_at`, `metodo_pago`, etc.).
- Sin **cuentas por pagar / pasivos**.
- Sin **devoluciones parciales** (solo anular completa).
- Sin **lotes / caducidad** por compra.

Pendientes en backlog (no fase actual).
