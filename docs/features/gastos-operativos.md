# Gastos operativos (OPEX)

> Introducido 2026-06-22.

Módulo que permite al **owner** del local llevar el control de sus gastos
operativos mensuales: luz, agua, gas, internet, renta, nómina,
mantenimiento, marketing, impuestos, seguros, comisiones bancarias y otros.

Distinto de **Compras** (que es inventario de insumos para producir pedidos).
Acá hablamos de gasto fijo / variable del negocio, no de costo de venta.

## Motivación

El owner ya tenía métricas de ventas (`/admin/metricas`) y costo de insumos
(`/admin/compras`). Faltaba el otro lado del flujo de caja: cuánto se va por
gastos fijos cada mes. Con este módulo puede:

1. Registrar cada gasto a medida que paga (factura CFE, recibo de agua, renta).
2. Ver el **total del mes** en un solo número.
3. Comparar contra el **mes anterior** (delta % automático).
4. Ver **desglose por categoría** en barras horizontales (qué le pesa más).

## Endpoints

Todos bajo `auth:sanctum` + `tenant` middleware, ruta base `/api/v1/gastos`:

| Método  | Path                          | Quién                       |
|---------|-------------------------------|-----------------------------|
| GET     | `/gastos`                     | owner + staff (read-only)   |
| GET     | `/gastos/resumen`             | owner + staff               |
| POST    | `/gastos`                     | **solo owner**              |
| GET     | `/gastos/{id}`                | owner + staff (tenant)      |
| PATCH   | `/gastos/{id}`                | **solo owner**              |
| DELETE  | `/gastos/{id}` (soft delete)  | **solo owner**              |

Filtros para `GET /gastos`: `categoria=luz`, `desde=YYYY-MM-DD`,
`hasta=YYYY-MM-DD`, `mes=YYYY-MM`.

## Modelo

```php
App\Models\Gasto
  uses HasFactory, SoftDeletes, BelongsToTenant;

  const CATEGORIAS = [
    'luz', 'agua', 'gas', 'internet', 'telefono', 'renta',
    'nomina', 'mantenimiento', 'marketing', 'impuestos',
    'seguros', 'comisiones_bancarias', 'otros',
  ];
```

Multi-tenancy via `BelongsToTenant` → al crear, `local_id` se inyecta solo
del `TenantContext`. Imposible crear gasto de otro local.

## Reglas de dinero

El **API expone `monto_mxn`** (decimal con 2 decimales, ej. `1234.56`) y lo
convierte internamente a `monto_centavos` (unsigned int) con:

```php
'monto_centavos' => (int) round($data['monto_mxn'] * 100)
```

Misma estrategia que `Pedido::total_centavos` — evita drift de floats al sumar
o agrupar. La columna BD nunca contiene un decimal.

## Resumen mensual

`GET /gastos/resumen?mes=2026-06` devuelve:

```json
{
  "data": {
    "mes": "2026-06",
    "total_mxn": 12500.50,
    "total_centavos": 1250050,
    "total_prev_mxn": 11000.00,
    "delta_pct": 13.6,
    "por_categoria": [
      { "categoria": "renta", "total_mxn": 8000, "total_centavos": 800000, "cantidad": 1 },
      { "categoria": "luz",   "total_mxn": 2300, "total_centavos": 230000, "cantidad": 2 }
    ]
  }
}
```

Si no hay mes previo (negocio recién empezando), `delta_pct = null` y el
frontend oculta el badge de comparación.

## UI

Página: `/admin/gastos`. Solo visible para owners (no aparece en sidebar de
staff).

- **Tarjeta de resumen** arriba: total del mes + delta vs mes anterior +
  selector de mes (últimos 12).
- **Barras horizontales** de las 6 categorías más caras del mes.
- **Filtros chips** por categoría.
- **Lista** de gastos del mes (concepto, monto, fecha, recurrente).
- **Modal de alta/edición** con form completo + soft delete.

## Tests

`tests/Feature/GastoTest.php` cubre:
- Owner lista solo gastos de su local (tenant isolation)
- Conversión `monto_mxn → monto_centavos`
- Validación de categoría enum
- Validación de fecha (no future)
- Staff no puede crear (policy)
- Owner no ve gasto de otro local (policy)
- Update + soft delete
- Resumen total y breakdown

## Por hacer (próximo sprint)

- [ ] Upload de comprobante (foto del recibo) — el campo `comprobante_url` ya existe,
  falta el endpoint y el componente.
- [ ] Gráfico de tendencia trimestral en `/admin/metricas` (combinar ventas vs gastos).
- [ ] Auto-generar recordatorio cuando un gasto recurrente lleva +35 días sin nuevo registro.
- [ ] Exportar a CSV/Excel para contador.
