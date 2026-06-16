# Cupones globales (plantillas)

Plantillas de cupón que el `super_admin` crea una sola vez y replica a
**todos los locales** activos con un click. Útil para promociones
plataforma-wide (ej. "10% en todos los restaurantes el 14-feb").

## Modelo

Tabla `cupones_globales`:

| Columna            | Tipo              | Notas |
|--------------------|-------------------|-------|
| `id`               | bigInt PK         |       |
| `codigo`           | string(40) unique | Se replica idéntico en cada local |
| `descripcion`      | text nullable     |       |
| `tipo`             | enum (`porcentaje`, `monto`) |  |
| `valor`            | decimal(10,2)     | % si tipo=porcentaje; MXN si tipo=monto |
| `min_subtotal`     | decimal(10,2)     | default 0 |
| `max_usos_por_local` | int nullable    | null = sin tope |
| `aplicar_nuevos`   | boolean           | si true, también aplicar al sincronizar a locales que aún no existen al momento de crear el cupón |
| `vigente_desde`    | timestamp nullable |  |
| `vigente_hasta`    | timestamp nullable |  |
| timestamps         |                   |       |

## Endpoints

```
GET    /api/v1/admin/cupones-globales         super_admin
POST   /api/v1/admin/cupones-globales         super_admin   crear plantilla
POST   /api/v1/admin/cupones-globales/{id}/sync   super_admin   replicar a TODOS los locales
DELETE /api/v1/admin/cupones-globales/{id}    super_admin
```

## Flujo "replicar a todos"

`POST /admin/cupones-globales/{id}/sync` itera todos los locales activos
(con `plan_status` = active o trial) y para cada uno hace `upsert` en la
tabla `cupones` del local — usando `local_id + codigo` como llave única.
Si el código ya existe en el local, se actualiza con los nuevos valores.

Los cupones replicados quedan como cupones normales del local; el owner
puede editarlos o borrarlos individualmente. Esto significa que la plantilla
global es un **point-in-time snapshot**, no una vinculación viva.

## Frontend

- `apps/web/src/app/admin/cupones-globales/page.tsx` — listado +
  `CrearCuponModal`.
- Botón "Replicar a todos" muestra count de locales afectados en el toast
  de éxito.
