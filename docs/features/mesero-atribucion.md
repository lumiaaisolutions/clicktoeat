# Feature — Atribución de mesero y cobrador (salón)

> Quién atiende cada mesa y quién cobró cada pedido. Complementa el flujo de
> salón ([`salon-flujo-audit.md`](./salon-flujo-audit.md),
> [`salon-roadmap.md`](./salon-roadmap.md)) con trazabilidad por persona.

## Qué se atribuye

| Concepto | Columna | Relación | Migración |
|----------|---------|----------|-----------|
| Mesero que **atiende** una mesa | `mesas.atendido_por` (+ `atendido_desde`) | `Mesa::mesero()` | `2026_08_31_120000_add_atendido_por_to_mesas_table.php` |
| Usuario que **cobró** un pedido | `pedidos.cobrado_por` | `Pedido::cobrador()` | `2026_09_12_180000_add_cobrado_por_to_pedidos_table.php` |

Ambas FK a `users` son **solo MySQL** (sqlite no soporta agregar FK vía ALTER)
y nullable (mesa libre sin mesero / pago legacy sin cobrador). Detalle de
columnas en [`../database/schema.md`](../database/schema.md).

`atendido_por` se setea al tomar la mesa (`POST /mesas/{mesa}/tomar`) y se limpia
al liberarla. `cobrado_por` se setea al marcar pagado un pedido de mostrador
(`CajaController::cobrarPedido` recibe `$user->id`) o al cerrar una cuenta de
mesa.

## En el frontend

- **Mesas / mapa de salón**: cada mesa muestra "Atiende: {mesero}".
- **Caja**: las cuentas abiertas muestran "Atiende"; la lista "Cobrados hoy"
  (`GET /caja/cobrados`) muestra "Cobró" con el nombre del `cobrador`, junto al
  `metodo_pago` y `pagado_at`.
- **Historial de cliente** en caja: consulta `GET /clientes/historial?telefono=`
  (pedidos, total gastado, primer/último pedido).

## Permisos y presets de Equipo

El preset **"Mesero"** en `/admin/staff` (modal de nuevo empleado) asigna:

```
permisos: ['pedidos', 'pos', 'mesas', 'caja']
```

Además la grilla de permisos expone los módulos de salón —
`mesas`, `caja`, `cocina`, `mesero` — como checkboxes independientes.
Ver [`staff-permissions.md`](./staff-permissions.md) para el catálogo completo
de módulos y presets.

Las rutas de salón están gateadas por plan (`feature:dine_in` /
`feature:caja_fisica`) **y** por permiso (`permiso:mesero`, `permiso:caja`,
`permiso:cocina`) — ver `routes/api.php`.
