# Feature — Punto de venta interno (POS)

## Caso de uso

El cajero/owner registra una venta presencial en el local (ej. cliente entra, pide, paga en caja). Esto:
- No requiere `wa.me` (el cliente está físicamente).
- Debe descontar inventario igual que un pedido público.
- Puede usar métodos de pago adicionales (`tarjeta_tpv`).
- Debe quedarse contabilizado en métricas.

## Endpoint

`POST /api/v1/pedidos` (tenant-scoped).

Validación: `Pedido/StoreInternalPedidoRequest`.

## Particularidades

### Cliente opcional
- `cliente.nombre` → default `"Mostrador"`.
- `cliente.telefono` → default `"-"`.
- `cliente.notas` → opcional.
- `cliente.direccion` siempre null.

Razón: una venta presencial no tiene cliente identificado.

### Métodos extendidos
- `metodo_entrega`: además de `pickup`/`delivery`, acepta `sucursal` (consumo en el local).
- `metodo_pago`: además de los públicos, acepta `tarjeta_tpv` (terminal de venta).

Definidos en migración `2024_02_01_extend_pedidos_enums_for_pos.php` — sólo en MySQL, no-op en sqlite (tests).

### Auto-confirmación para sucursal
`PedidoController::store`:
```php
if ($pedido->metodo_entrega === 'sucursal' && $pedido->estado === 'nuevo') {
    $pedido->forceFill(['estado' => 'confirmado', 'confirmado_at' => now()])->save();
}
```

Razón: el cliente ya pagó/recibió, no tiene sentido dejarlo en `nuevo`.

### Sin URL WhatsApp
Cuando `metodo_entrega = sucursal`, `OrderService::crear` salta la generación de `whatsapp_url`. La columna queda NULL.

## Flujo

```
Caja
  │  POST /pedidos { cliente?, metodo_entrega='sucursal', metodo_pago, items[] }
  │  + Authorization: Bearer <owner|staff token>
  ▼
StoreInternalPedidoRequest::authorize()
  └── user must be owner | staff | super_admin con local_id
StoreInternalPedidoRequest::rules() → 422 si payload inválido
StoreInternalPedidoRequest::toOrderInput() → normaliza al shape de OrderService
  ▼
PedidoController::store
  ├── Local::withoutGlobalScopes()->findOrFail($user->local_id)
  ├── OrderService::crear($local, $input)   // misma lógica que público
  │     └── descuenta inventario + maneja stock
  ├── Si entrega==='sucursal' → auto-confirmar
  └── return 201 con PedidoResource
```

## Frontend

Página: `apps/web/src/app/admin/punto-venta/page.tsx`.

Carga el catálogo del local (productos disponibles), permite armar items con extras, total en pantalla, envía la venta. Tras la confirmación 201 vuelve a estado limpio para la siguiente venta.

## Comparativa con flujo público

Ver tabla completa en [`features/pedidos.md`](pedidos.md#diferencias-público-vs-interno).

## Limitaciones / pendientes

- Sin **descuentos** (campo `descuento` siempre 0). Pendiente cupones (fase 6).
- Sin **propina**.
- Sin **split payment** (mitad efectivo, mitad tarjeta).
- Sin **ticket impreso** (sólo se ve en pantalla).
- Sin integración a **TPV físico** (es sólo una etiqueta).
- Sin **cierre de caja**.

Todos pendientes — ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md).
