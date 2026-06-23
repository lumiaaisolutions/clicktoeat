# API — Gastos operativos

> Endpoints bajo `auth:sanctum` + middleware `tenant`. Multi-tenancy
> automática via `BelongsToTenant`. Ver
> [`docs/features/gastos-operativos.md`](../features/gastos-operativos.md)
> para contexto del producto.

## Permisos

| Acción       | owner | staff | super_admin |
|--------------|:-----:|:-----:|:-----------:|
| viewAny / view | ✅   | ✅   | ✅          |
| create / update / delete | ✅ | ❌ | ✅ |
| upload comprobante | ✅ | ❌ | ❌ (via tenant) |
| export CSV   | ✅    | ✅    | ✅          |

## Endpoints

| Método | Path                              | Descripción |
|--------|-----------------------------------|-------------|
| GET    | `/v1/gastos`                      | Lista paginada (50/pág). Filtros: `categoria`, `mes`, `desde`, `hasta` |
| POST   | `/v1/gastos`                      | Crear (solo owner). Recibe `monto_mxn`, lo convierte a `monto_centavos` |
| GET    | `/v1/gastos/{id}`                 | Mostrar uno |
| PATCH  | `/v1/gastos/{id}`                 | Editar (solo owner). Todos los campos `sometimes` |
| DELETE | `/v1/gastos/{id}`                 | Soft delete (solo owner) |
| GET    | `/v1/gastos/resumen?mes=YYYY-MM`  | Total + delta vs mes anterior + breakdown por categoría |
| GET    | `/v1/gastos/export?mes=&categoria=` | Descarga CSV con UTF-8 BOM |
| POST   | `/v1/gastos/{id}/comprobante`     | Sube comprobante (img/pdf, max 5 MB) |
| DELETE | `/v1/gastos/{id}/comprobante`     | Borra comprobante adjunto |

## Categorías válidas

`luz`, `agua`, `gas`, `internet`, `telefono`, `renta`, `nomina`,
`mantenimiento`, `marketing`, `impuestos`, `seguros`,
`comisiones_bancarias`, `otros`.

Cualquier otro valor → 422.

## Body — POST/PATCH

```json
{
  "categoria":  "luz",
  "concepto":   "CFE bimestral mayo-junio",
  "monto_mxn":  1234.56,
  "fecha":      "2026-06-15",
  "recurrente": true,
  "notas":      "Factura #ABC123",
  "comprobante_url": "https://..."
}
```

Validación clave:
- `categoria` ∈ enum (ver arriba)
- `concepto` ≤ 200 chars
- `monto_mxn` ∈ [0.01, 999999.99]
- `fecha` ≤ today
- `notas` ≤ 1000 chars
- `comprobante_url` URL válida ≤ 500 chars

## Respuesta — show

```json
{
  "data": {
    "id": 42,
    "local_id": 1,
    "categoria": "luz",
    "concepto":  "CFE",
    "monto_centavos": 123456,
    "fecha":     "2026-06-15",
    "recurrente": true,
    "notas":     null,
    "comprobante_url": "https://.../storage/uploads/comprobantes/gasto-42-ab12cd34.png",
    "created_by_user_id": 7,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

> Nota: el API expone `monto_centavos` (int). Si necesitas decimal MXN
> en frontend: `monto_centavos / 100`. Para crear/editar usa `monto_mxn`.

## Resumen — GET `/gastos/resumen?mes=YYYY-MM`

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

`delta_pct` es `null` si no hay datos del mes anterior.

## Export CSV

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://clicktoeat-api.lumiaaisolutions.com/api/v1/gastos/export?mes=2026-06" \
  -o gastos-2026-06.csv
```

- Content-Type: `text/csv; charset=UTF-8`
- BOM UTF-8 al inicio (Excel-friendly)
- Filename automático: `gastos-{mes}.csv` (o `gastos-{mes-actual}.csv`)
- Mismos filtros que `index`

## Upload de comprobante

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "comprobante=@factura.pdf" \
  https://clicktoeat-api.lumiaaisolutions.com/api/v1/gastos/42/comprobante
```

- `comprobante` (file, requerido): `jpg|jpeg|png|webp|pdf`, ≤ 5 MB
- Reemplaza el anterior si existía (borra el file viejo del disk)
- Devuelve el `Gasto` completo con `comprobante_url` actualizada

DELETE limpia el file físico y pone `comprobante_url=null`.

## Métricas — utilidad neta

Endpoint adicional en `MetricasController` que cruza pedidos vs gastos:

```
GET /v1/metricas/utilidad?meses=N   (default 6, máx 24)
```

Ver `docs/features/gastos-operativos.md` para shape de respuesta.

## Cron

Daily 09:30 — `gastos:check-recurrentes` notifica al owner si un gasto
recurrente lleva > 35 días sin nuevo registro. Detalle:
[`docs/runbook/cron-gastos-recurrentes.md`](../runbook/cron-gastos-recurrentes.md).
