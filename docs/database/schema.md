# Base de datos — Esquema

> Fuente: migraciones en `apps/api/database/migrations/`. El dump `bd/bdclicktoeat.sql` está **desactualizado** — ver [`issues/discrepancias-readme.md`](../issues/discrepancias-readme.md).

MySQL 8 · charset `utf8mb4` · collation `utf8mb4_unicode_ci` · engine `InnoDB`.

---

## Tablas de negocio

### `locales` — el tenant

| Columna                | Tipo               | Notas                                                  |
|------------------------|--------------------|--------------------------------------------------------|
| `id`                   | bigint PK          |                                                        |
| `nombre`               | varchar(255)       |                                                        |
| `slug`                 | varchar(255) UNIQUE| URL pública: `/{slug}`                                  |
| `tagline`              | varchar(255) null  |                                                        |
| `logo_url`             | varchar(255) null  |                                                        |
| `banner_url`           | varchar(255) null  |                                                        |
| `color_primario`       | varchar(9)         | default `#FF2D2D`                                       |
| `color_secundario`     | varchar(9)         | default `#0B0B0F`                                       |
| `color_fondo`          | varchar(9)         | default `#FAFAF7`                                       |
| `tipografia`           | varchar(255)       | default `Bricolage Grotesque`                           |
| `dark_mode`            | tinyint(1)         | default 0                                                |
| `whatsapp`             | varchar(20)        | obligatorio — para el botón                              |
| `telefono`             | varchar(20) null   |                                                        |
| `email_contacto`       | varchar(255) null  |                                                        |
| `direccion`            | text null          |                                                        |
| `lat` / `lng`          | decimal(10,7) null | Mapa Leaflet                                             |
| `horarios`             | json null          | `[{dia:'lun', open:'12:00', close:'23:00'}, ...]`         |
| `zona_entrega`         | json null          | reservado                                                |
| `delivery_fee`         | decimal(8,2)       | default 0                                                |
| `delivery_min_minutos` | smallint           | default 30                                               |
| `delivery_radio_km`    | smallint           | default 5 (mig `2024_05_02`)                             |
| `redes_sociales`       | json null          | `{ig, fb, tt, wapp}`                                     |
| `metodos_pago`         | json null          | array `["efectivo","tarjeta_entrega","transferencia"]` (mig `2024_05_03`) |
| `activo`               | tinyint(1)         | default 1                                                |
| `suspendido`           | tinyint(1)         | default 0                                                |
| `cerrado_temporal`     | tinyint(1)         | default 0 (mig `2024_05_01`)                             |
| `zona_horaria`         | varchar(60)        | default `America/Mexico_City` (mig `2024_05_01`)         |
| `modulos`              | json null          | flags por local (reservado)                              |
| `owner_id`             | bigint FK→users    | null on delete                                            |
| timestamps + softDelete |                    |                                                          |

Índices: UNIQUE `slug`, KEY `owner_id`, `activo`, `suspendido`.

---

### `users`

| Columna             | Tipo                   | Notas                            |
|--------------------|------------------------|----------------------------------|
| `id`                | bigint PK              |                                  |
| `nombre`            | varchar(255)           |                                  |
| `email`             | varchar(255) UNIQUE    |                                  |
| `email_verified_at` | timestamp null         | nunca se valida en runtime       |
| `password`          | varchar(255)           | bcrypt                            |
| `rol`               | enum                   | `super_admin` / `owner` / `staff` |
| `local_id`          | bigint FK→locales null | null para super_admin            |
| `remember_token`    | varchar(100) null      |                                  |
| timestamps + softDelete |                    |                                  |

Índices: UNIQUE `email`, KEY `rol`, `local_id`.

---

### `categorias`

| Columna     | Tipo                   |
|-------------|------------------------|
| `id`         | bigint PK              |
| `local_id`   | bigint FK→locales (cascade) |
| `nombre`     | varchar(255)           |
| `slug`       | varchar(255)           |
| `icono`      | varchar(255) null      |
| `orden`      | smallint default 0     |
| `activo`     | tinyint default 1      |
| timestamps  |                        |

Índices: UNIQUE `(local_id, slug)`, KEY `(local_id, orden)`.

---

### `productos`

| Columna             | Tipo                            |
|---------------------|---------------------------------|
| `id`                 | bigint PK                       |
| `local_id`           | bigint FK→locales (cascade)     |
| `categoria_id`       | bigint FK→categorias (cascade)  |
| `nombre`             | varchar(255)                    |
| `slug`               | varchar(255)                    |
| `descripcion`        | text null                       |
| `precio`             | decimal(10,2)                   |
| `precio_descuento`   | decimal(10,2) null              |
| `imagen_url`         | varchar(255) null               |
| `imagen_public_id`   | varchar(255) null               |
| `disponible`         | tinyint default 1               |
| `es_combo`           | tinyint default 0               |
| `es_promocion`       | tinyint default 0               |
| `tag`                | varchar(255) null               |
| `extras`             | json null  — grupos one/many    |
| `meta`               | json null                       |
| `orden`              | smallint default 0              |
| timestamps + softDelete |                              |

Índices: UNIQUE `(local_id, slug)`, KEY `(local_id, categoria_id, disponible)`.

`extras` ejemplo:
```json
[
  {"group":"Tortilla","kind":"one","required":true,
   "items":[{"id":"maiz","name":"Maíz","price":0},{"id":"harina","name":"Harina","price":5}]},
  {"group":"Salsas","kind":"many","required":false,
   "items":[{"id":"verde","name":"Verde","price":0},{"id":"habanero","name":"Habanero","price":0}]}
]
```

---

### `ingredientes`

| Columna           | Tipo                            |
|------------------|---------------------------------|
| `id`              | bigint PK                       |
| `local_id`        | bigint FK→locales (cascade)     |
| `nombre`          | varchar(255)                    |
| `stock`           | decimal(12,3) default 0         |
| `stock_minimo`    | decimal(12,3) default 0         |
| `unidad`          | varchar(16) default `pz`         |
| `costo_unitario`  | decimal(10,2) default 0         |
| `activo`          | tinyint default 1               |
| timestamps        |                                  |

Índices: KEY `(local_id, activo)`. Unidades válidas: `pz`, `kg`, `g`, `l`, `ml` (validado en FormRequest, no en BD).

---

### `recetas`

Vincula un producto con sus ingredientes O con otro producto componente (compuestos).

| Columna                   | Tipo                              |
|---------------------------|-----------------------------------|
| `id`                       | bigint PK                          |
| `producto_id`              | bigint FK→productos (cascade)      |
| `ingrediente_id`           | bigint FK→ingredientes (cascade) null |
| `componente_producto_id`   | bigint FK→productos (cascade) null  |
| `cantidad`                 | decimal(12,3)                      |
| timestamps                 |                                    |

Índices: UNIQUE `(producto_id, ingrediente_id)`, UNIQUE `(producto_id, componente_producto_id)`.

**Regla de negocio:** una fila usa **uno** de los dos punteros (ingrediente OR componente), nunca ambos. Enforzado por `SyncRecetaRequest`. No hay CHECK constraint en BD.

Ver [`features/recetas.md`](../features/recetas.md).

---

### `pedidos`

| Columna               | Tipo                                                    |
|----------------------|---------------------------------------------------------|
| `id`                   | bigint PK                                                |
| `codigo`               | varchar(12) UNIQUE — `CE-XXXXXX`                          |
| `local_id`             | bigint FK→locales (cascade)                              |
| `cliente_nombre`       | varchar(255)                                              |
| `cliente_telefono`     | varchar(20)                                               |
| `direccion`            | text null                                                  |
| `notas`                | text null                                                  |
| `metodo_entrega`       | enum `pickup` / `delivery` / `sucursal`                    |
| `metodo_pago`          | enum `efectivo` / `tarjeta_entrega` / `tarjeta_tpv` / `transferencia` |
| `subtotal` / `delivery_fee` / `descuento` / `total` | decimal(10,2) |
| `estado`               | enum (ver más abajo)                                       |
| `whatsapp_url`         | text null                                                  |
| `confirmado_at`        | timestamp null                                              |
| `entregado_at`         | timestamp null                                              |
| timestamps + softDelete|                                                          |

`estado` enum: `nuevo`, `confirmado`, `preparando`, `listo`, `en_camino`, `entregado`, `cancelado`.

Índices: UNIQUE `codigo`, KEY `estado`, KEY `(local_id, estado, created_at)`.

---

### `detalle_pedidos`

| Columna                | Tipo                                |
|-----------------------|-------------------------------------|
| `id`                    | bigint PK                            |
| `pedido_id`             | bigint FK→pedidos (cascade)          |
| `producto_id`           | bigint FK→productos (null on delete) |
| `producto_nombre`       | varchar(255) — **snapshot**          |
| `precio_unitario`       | decimal(10,2) — **snapshot**          |
| `cantidad`              | smallint                              |
| `subtotal`              | decimal(10,2)                         |
| `extras_seleccionados`  | json null — `[{group,item,price}]`    |
| `notas`                 | text null                              |

Snapshot por diseño: aunque el producto se renombre o suba precio, el pedido viejo conserva los datos originales.

---

### `movimientos_inventario`

| Columna             | Tipo                                |
|---------------------|-------------------------------------|
| `id`                 | bigint PK                            |
| `local_id`           | bigint FK→locales                    |
| `ingrediente_id`     | bigint FK→ingredientes (cascade)     |
| `tipo`               | enum `entrada` / `salida` / `ajuste` / `merma` |
| `cantidad`           | decimal(12,3) (puede ser negativa en ajustes) |
| `stock_resultante`   | decimal(12,3) — fotografía post-op   |
| `referencia`         | varchar(255) null — `pedido:N`, `compra:N`, `compra:N:anulacion`, `pedido:N:reintegro`, `alta`, `manual` |
| `motivo`             | varchar(255) null                    |
| `user_id`            | bigint FK→users null on delete       |
| timestamps           |                                       |

Índices: KEY `(local_id, ingrediente_id, created_at)`.

---

### `compras`

| Columna                | Tipo                            |
|-----------------------|---------------------------------|
| `id`                    | bigint PK                        |
| `codigo`                | varchar(16) UNIQUE — `CP-XXXXXX` |
| `local_id`              | bigint FK→locales (cascade)      |
| `proveedor`             | varchar(150) null                |
| `referencia_factura`    | varchar(60) null                 |
| `fecha`                 | date                             |
| `subtotal` / `impuestos` / `total` | decimal(12,2)        |
| `notas`                 | text null                         |
| `estado`                | enum `registrada` / `anulada`    |
| `user_id`               | bigint FK→users null on delete    |
| timestamps + softDelete |                                  |

Índices: UNIQUE `codigo`, KEY `(local_id, estado, fecha)`, KEY `estado`.

---

### `detalle_compras`

| Columna           | Tipo                                |
|------------------|-------------------------------------|
| `id`              | bigint PK                            |
| `compra_id`       | bigint FK→compras (cascade)          |
| `ingrediente_id`  | bigint FK→ingredientes (cascade)     |
| `cantidad`        | decimal(12,3)                        |
| `costo_unitario`  | decimal(12,2)                        |
| `subtotal`        | decimal(12,2)                        |
| timestamps        |                                      |

---

### `notificaciones`

| Columna     | Tipo                          |
|-------------|-------------------------------|
| `id`         | bigint PK                      |
| `local_id`   | bigint FK→locales (cascade)    |
| `tipo`       | varchar(40) — p.ej. `bajo_stock` |
| `titulo`     | varchar(255)                    |
| `mensaje`    | text                            |
| `data`       | json null                       |
| `leida_at`   | timestamp null                  |
| timestamps   |                                  |

Índices: KEY `(local_id, leida_at, created_at)`.

---

## Tablas de framework

### `personal_access_tokens` (Sanctum)
`tokenable_morphs`, `name`, `token (64) UNIQUE`, `abilities (text)`, `last_used_at`, `expires_at` (index), timestamps.

### `password_reset_tokens`
`email PK`, `token`, `created_at`. **Tabla existe pero no se usa** — sin endpoints de reset.

### `sessions`
Backing del driver `session=database`. No tiene rol funcional con tokens.

### `cache` / `cache_locks`
Backing del driver `cache=database`.

### `jobs` / `job_batches` / `failed_jobs`
Backing de `queue=database`. **No hay Jobs definidos** — todas las operaciones son síncronas (ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md)).

### `migrations`
Tabla de control de Laravel.

---

## Convenciones

- Nombres de tabla: **plural snake_case en español** (`pedidos`, `categorias`).
- Pivotes/líneas: **`detalle_*`** (`detalle_pedidos`, `detalle_compras`).
- Soft-delete en: `users`, `locales`, `productos`, `pedidos`, `compras`.
- Timestamps Laravel (`created_at`, `updated_at`) en todas; `deleted_at` donde aplica.
- JSON columns en lugar de tablas-pivote para datos con shape libre (`extras`, `redes_sociales`, `horarios`, `zona_entrega`, `modulos`).
