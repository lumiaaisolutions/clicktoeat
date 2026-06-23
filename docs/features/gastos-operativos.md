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

`tests/Feature/GastoTest.php` (18 tests) cubre:
- Owner lista solo gastos de su local (tenant isolation)
- Conversión `monto_mxn → monto_centavos`
- Validación de categoría enum
- Validación de fecha (no future)
- Staff no puede crear (policy)
- Owner no ve gasto de otro local (policy)
- Update + soft delete
- Resumen total y breakdown
- Upload + delete de comprobante (img + pdf)
- Replace de comprobante (idempotente, borra el anterior)
- Rechazo de MIME no permitido + archivo > 5MB
- Export CSV con UTF-8 BOM y filtros

`tests/Feature/MetricasUtilidadTest.php` (2 tests) cubre:
- Cálculo correcto de ventas − gastos por mes
- Tenant isolation: el otro local no contamina el total

`tests/Feature/GastosRecurrentesCommandTest.php` (4 tests) cubre:
- Notifica si > 35 días sin registro
- No notifica si está al día (≤ 35 días)
- Idempotencia: 3 corridas del cron seguidas → 1 sola notif
- Ignora gastos no-recurrentes

## Extensiones (2026-06-22, post-MVP)

### Comprobante adjunto

Cada gasto puede tener un **comprobante** (imagen JPG/PNG/WEBP o PDF, máx 5 MB).
Se sube vía:

```
POST   /v1/gastos/{id}/comprobante   (multipart/form-data, field: comprobante)
DELETE /v1/gastos/{id}/comprobante
```

Archivo va a `storage/app/public/uploads/comprobantes/gasto-{id}-{rand8}.{ext}`
y la URL pública se persiste en `gastos.comprobante_url`.

- Permiso: **solo owner** (policy `update`).
- Upload reemplaza al anterior (borra el archivo viejo del disk).
- En el modal de edición se muestra:
  - Thumbnail si es imagen
  - Ícono 📄 si es PDF
  - Botón "Ver comprobante" (abre en pestaña nueva)
  - Botón "Quitar" (DELETE)

### Export CSV

```
GET /v1/gastos/export?mes=YYYY-MM&categoria=X
```

Devuelve `text/csv` con UTF-8 BOM (Excel lo abre con acentos correctos).
Columnas: `Fecha, Categoría, Concepto, Monto MXN, Recurrente, Notas, Comprobante`.

Filtros opcionales: `mes`, `categoria`, `desde`, `hasta`.
Filename automático: `gastos-YYYY-MM.csv`.

En UI: botón "CSV" en la cabecera de `/admin/gastos`.

### Utilidad neta — integración en `/admin/metricas`

```
GET /v1/metricas/utilidad?meses=N   (default 6, máx 24)
```

Devuelve serie mensual con:
```json
{
  "meses": 6,
  "serie": [
    { "mes": "2026-06", "label": "jun. 26",
      "ventas_mxn": 5000, "gastos_mxn": 1500,
      "utilidad_mxn": 3500, "margen_pct": 70.0 }
  ],
  "total_ventas": ..., "total_gastos": ..., "total_utilidad": ...,
  "margen_promedio": 65.4
}
```

- **Ventas** = `SUM(pedidos.total)` con `estado != 'cancelado'`
- **Gastos** = `SUM(gastos.monto_centavos) / 100`
- **Utilidad** = ventas − gastos
- No descuenta costo de insumos (`compras`) porque pocos locales capturan
  compras consistentemente. Si en el futuro se quiere precisión contable,
  agregar tercera línea "costo de venta".

UI: nueva sección "Utilidad neta" en `/admin/metricas`, debajo de "Ventas por día",
con gráfico dual-line (ventas verde + gastos naranja) + tabla con margen % por mes.

### Cron: recordatorio de gastos recurrentes

```
php artisan gastos:check-recurrentes
```

Programado diario 09:30 (Laravel scheduler). Notifica al owner si un gasto
recurrente lleva > 35 días sin nuevo registro. Idempotente vía
`titulo + tipo + 7 días` window.

Detalle: [`docs/runbook/cron-gastos-recurrentes.md`](../runbook/cron-gastos-recurrentes.md).

## Por hacer (futuro, no urgente)

- [ ] Pantalla equivalente en la app móvil (apps/mobile/) — hoy solo web.
- [ ] Convertir `Schedule->at('09:30')` a TZ MX (hoy es UTC) para que llegue 9:30 hora local.
- [ ] Export XLSX nativo (`phpoffice/phpspreadsheet`) si el contador prefiere xlsx.
- [ ] Alerta automática si los gastos crecen > 20 % vs trimestre anterior.
