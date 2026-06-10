# Base de datos — Migraciones

Listado en orden de ejecución. Ubicación: `apps/api/database/migrations/`.

| Archivo                                              | Qué hace                                                                                  |
|-----------------------------------------------------|-------------------------------------------------------------------------------------------|
| `0001_01_01_000000_create_users_table.php`            | `users`, `password_reset_tokens`, `sessions`                                              |
| `0001_01_01_000001_create_cache_table.php`            | `cache`, `cache_locks` (driver cache=database)                                            |
| `0001_01_01_000002_create_jobs_table.php`             | `jobs`, `job_batches`, `failed_jobs` (driver queue=database — sin Jobs reales aún)        |
| `2024_01_01_000000_create_personal_access_tokens_table.php` | Tabla de Sanctum                                                                  |
| `2024_01_02_000000_create_locales_table.php`          | El tenant: identidad + branding + horarios + delivery + redes                              |
| `2024_01_03_000000_create_categorias_table.php`       | Categorías por local                                                                       |
| `2024_01_04_000000_create_productos_table.php`        | Productos por categoría (con `extras` JSON, snapshot via `imagen_public_id`)               |
| `2024_01_05_000000_create_ingredientes_table.php`     | Ingredientes + `movimientos_inventario` (en el mismo archivo)                              |
| `2024_01_06_000000_create_recetas_table.php`          | Relación producto ↔ ingrediente (más componente_producto_id nullable desde el inicio)      |
| `2024_01_07_000000_create_pedidos_table.php`          | Pedidos con enums `metodo_entrega`/`metodo_pago` y máquina de estados                       |
| `2024_01_08_000000_create_detalle_pedidos_table.php`  | Detalles snapshotteados (nombre, precio, extras)                                            |
| `2024_02_01_000000_extend_pedidos_enums_for_pos.php`   | Agrega `sucursal` a `metodo_entrega` y `tarjeta_tpv` a `metodo_pago` (sólo MySQL, no-op en sqlite) |
| `2024_02_02_000000_widen_pedidos_whatsapp_url.php`     | `whatsapp_url` pasa de varchar(500) a TEXT (mensajes encodeados crecen rápido)             |
| `2024_03_01_000000_extend_recetas_with_componente.php`| Idempotente: añade `componente_producto_id` si no existe + hace `ingrediente_id` nullable  |
| `2024_03_02_000000_create_notificaciones_table.php`    | Notificaciones in-app (`bajo_stock`, etc.)                                                 |
| `2024_04_01_000000_create_compras_tables.php`          | Compras a proveedor + sus detalles                                                          |
| `2024_05_01_000000_add_cerrado_temporal_to_locales.php`| Override manual del estado + `zona_horaria` por local                                       |
| `2024_05_02_000000_add_delivery_radio_to_locales.php`  | `delivery_radio_km` (default 5)                                                             |
| `2024_05_03_000000_add_metodos_pago_to_locales.php`    | `metodos_pago` JSON (lista de métodos aceptados por el local)                              |

## Convenciones

- **Prefijo de fecha**: `YYYY_MM_DD_NNNNNN` — Laravel ordena por nombre.
- **Migraciones reformistas** (alter): idempotentes con `Schema::hasColumn(...)`.
- **Migraciones cross-driver**: usan `if (DB::connection()->getDriverName() !== 'mysql') return;` para skip en sqlite (los tests corren con sqlite in-memory donde los `enum` son strings).
- **`->softDeletes()` en**: users, locales, productos, pedidos, compras.
- **`->timestamps()` en**: todas.

## Cómo crear una nueva migración

```bash
docker compose exec api php artisan make:migration add_xxx_to_yyy_table
# o sin Docker:
cd apps/api && php artisan make:migration add_xxx_to_yyy_table
```

Reglas internas:
1. **No editar migraciones ya ejecutadas en producción** — crea una nueva.
2. **Validar idempotencia** cuando se reformen tablas (`hasColumn`, `hasIndex`).
3. **Pensar en sqlite** si la migración toca `enum`, `change()` de columna o usa SQL raw — proteger con guard `getDriverName()`.
4. Si añades una columna JSON, **dale default null** y maneja `?? []` en el modelo.
5. Si añades una columna a `locales`, recuerda agregarla al `$fillable` del modelo y al `LocalResource` para que se exponga.

## Migraciones pendientes (recomendadas)

Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md):

- CHECK constraint: `recetas.ingrediente_id IS NULL XOR componente_producto_id IS NULL`.
- Tabla `audit_logs` para trazabilidad de cambios sensibles.
- Tabla `cupones` (fase 6).
- Tabla `idempotency_keys` para `POST /public/pedidos/{slug}` (evita pedidos duplicados por reintentos del cliente).
