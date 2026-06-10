# API — Form Requests (validación)

Toda validación entra por una clase `App\Http\Requests\*`. Nada llega al modelo sin pasar reglas (`Model::unguard()` global). Convención: `authorize()` siempre presente, `rules()` declarativo, helpers en `prepareForValidation()`.

`apps/api/app/Http/Requests/`

## Auth

### `Auth/RegisterRequest`
```php
'nombre'   => required string min:2 max:120
'email'    => required email unique:users,email
'password' => required confirmed Password::min(8)->letters()->numbers()
```

### `Auth/LoginRequest`
```php
'email'    => required email
'password' => required string min:6 max:255
'device'   => nullable string max:120
```

---

## Locales

### `Local/UpdateBrandingRequest` — owner editando su propio local
`authorize()`: `$user->can('update', $local)` → policy.

Campos completos en el código fuente. Subgrupos:
- Identidad: `nombre`, `tagline`
- Branding: `logo_url`, `banner_url`, `color_*` (regex `#RRGGBB[AA]`), `tipografia`, `dark_mode`
- Contacto: `whatsapp` (regex `[0-9+]+`), `telefono`, `email_contacto`, `direccion`, `lat` (`between:-90,90`), `lng` (`between:-180,180`)
- Operación: `horarios[]` (`dia` en `lun,mar,mie,jue,vie,sab,dom`, `open`/`close` formato `H:i`), `delivery_fee`, `delivery_min_minutos`, `delivery_radio_km`, `zona_entrega`
- Pagos: `metodos_pago[]` (`efectivo|tarjeta_entrega|transferencia`)
- Redes: `redes_sociales.ig|fb|tt|wapp`

### `Local/UpdateHorariosRequest` — endpoint dedicado de horarios
```php
'horarios'         => present array max:7
'horarios.*.dia'   => required in:lun,mar,mie,jue,vie,sab,dom
'horarios.*.open'  => required date_format:H:i
'horarios.*.close' => required date_format:H:i
'cerrado_temporal' => sometimes boolean
'zona_horaria'     => sometimes string timezone
```

### `Admin/StoreLocalRequest` — super_admin
`authorize()`: `$user->isSuperAdmin()`.

Validación normal + sub-objeto opcional `owner` con `nombre`, `email`, `password` (confirmed, min 8). `prepareForValidation()` auto-genera `slug` desde `nombre` si no se proporciona.

### `Admin/UpdateLocalRequest`
Superset de `UpdateBrandingRequest` + permite cambiar `slug` (con `unique` ignore self).

---

## Categorías

### `Categoria/StoreCategoriaRequest`
```php
'nombre' => required string min:1 max:80
'slug'   => nullable string max:80 unique('categorias','slug')->where('local_id', $localId)
'icono'  => nullable string max:60
'orden'  => nullable integer min:0 max:9999
'activo' => nullable boolean
```
Auto-slug si no llega.

### `Categoria/UpdateCategoriaRequest`
Mismas reglas con `sometimes`, `unique` ignore self.

---

## Productos

### `Producto/StoreProductoRequest`
```php
'categoria_id'      => required integer exists('categorias','id')->where('local_id', $localId)
'nombre'            => required string min:2 max:120
'slug'              => nullable string max:140 unique('productos','slug')->where('local_id', $localId)
'descripcion'       => nullable string max:1000
'precio'            => required numeric min:0 max:999999.99
'precio_descuento'  => nullable numeric min:0 lt:precio
'imagen_url'        => nullable url max:500
'imagen_public_id'  => nullable string max:200
'disponible' | 'es_combo' | 'es_promocion' => nullable boolean
'tag'               => nullable string max:40
'orden'             => nullable integer min:0 max:9999

// Estructura de extras
'extras'                  => nullable array
'extras.*.group'          => required_with:extras string max:40
'extras.*.kind'           => required_with:extras in:one,many
'extras.*.required'       => nullable boolean
'extras.*.items'          => required_with:extras array min:1
'extras.*.items.*.id'     => required string max:40
'extras.*.items.*.name'   => required string max:60
'extras.*.items.*.price'  => required numeric min:0
```

### `Producto/UpdateProductoRequest`
Mismas reglas con `sometimes`.

---

## Ingredientes

### `Ingrediente/StoreIngredienteRequest`
```php
'nombre'         => required string min:1 max:80
'stock'          => required numeric min:0 max:999999.999
'stock_minimo'   => nullable numeric min:0 max:999999.999
'unidad'         => required in:pz,kg,g,l,ml
'costo_unitario' => nullable numeric min:0 max:999999.99
'activo'         => nullable boolean
```

### `Ingrediente/UpdateIngredienteRequest`
Mismas con `sometimes`.

### `Ingrediente/AjusteStockRequest`
```php
'tipo'     => required in:entrada,ajuste,merma
'cantidad' => required numeric not_in:0 min:-999999.999 max:999999.999
'motivo'   => nullable string max:200
```
0 explícitamente prohibido. Negativos permitidos en `ajuste` y `merma`.

---

## Recetas

### `Receta/SyncRecetaRequest`
```php
'recetas'                          => present array max:100
'recetas.*.ingrediente_id'         => required_without:recetas.*.componente_producto_id integer exists ingredientes.local_id
'recetas.*.componente_producto_id' => required_without:recetas.*.ingrediente_id integer
                                       + closure (no puede ser el mismo producto)
                                       + exists productos.local_id
'recetas.*.cantidad'               => required numeric min:0.001 max:999999.999
```

---

## Pedidos

### `Pedido/StorePublicPedidoRequest` — landing pública
```php
'cliente'                  => required array
'cliente.nombre'           => required string min:2 max:120
'cliente.telefono'         => required string min:7 max:20
'cliente.direccion'        => nullable string max:300
'cliente.lat'              => nullable numeric between:-90,90
'cliente.lng'              => nullable numeric between:-180,180
'cliente.notas'            => nullable string max:500

'metodo_entrega'           => required in:pickup,delivery
'metodo_pago'              => required in:efectivo,tarjeta_entrega,transferencia

'items'                    => required array min:1 max:50
'items.*.producto_id'      => required integer min:1
'items.*.cantidad'         => required integer min:1 max:99
'items.*.notas'            => nullable string max:200
'items.*.extras'           => nullable array
'items.*.extras.*.group'   => required_with:items.*.extras string max:40
'items.*.extras.*.item'    => required_with:items.*.extras string max:60
'items.*.extras.*.price'   => required_with:items.*.extras numeric min:0
```

### `Pedido/StoreInternalPedidoRequest` — POS / sucursal
Diferencias vs público:
- `cliente.nombre` y `cliente.telefono` son **nullable** (defaults: "Mostrador", "-").
- Acepta `metodo_entrega=sucursal`.
- Acepta `metodo_pago=tarjeta_tpv`.

`toOrderInput()` normaliza el payload para que `OrderService::crear` lo procese igual.

### `Pedido/UpdateEstadoPedidoRequest`
```php
'estado' => required in:nuevo,confirmado,preparando,listo,en_camino,entregado,cancelado
```

`authorize()`: `$user->can('updateEstado', $pedido)`.

---

## Compras

### `Compra/StoreCompraRequest`
```php
'proveedor'           => nullable string max:150
'referencia_factura'  => nullable string max:60
'fecha'               => nullable date
'impuestos'           => nullable numeric min:0 max:999999.99
'notas'               => nullable string max:1000

'items'                  => required array min:1 max:100
'items.*.ingrediente_id' => required integer exists ingredientes.local_id
'items.*.cantidad'       => required numeric min:0.001 max:999999.999
'items.*.costo_unitario' => required numeric min:0 max:999999.99
```

---

## Uploads

### `Upload/StoreImageRequest`
```php
'image'  => required file image mimetypes:image/jpeg,image/png,image/webp,image/avif max:5120  // KB
'folder' => nullable in:productos,locales,banners,logos
```

`messages()` traduce los errores comunes (max, uploaded, mimetypes) a español útil.
`failedValidation()` loguea contexto (content-type, file keys, errors) — debug para detectar problemas de upload limit del servidor.

---

## Patrones comunes

- **`authorize()` siempre devuelve** un boolean basado en policy o rol — nunca dejar `return true` por descuido.
- **`unique` por tenant** → siempre `Rule::unique('tabla','slug')->where('local_id', $localId)`.
- **`exists` por tenant** → idem `Rule::exists('tabla','id')->where('local_id', $localId)`.
- **`sometimes`** en updates para PATCH parcial.
- **`prepareForValidation()`** para autoslug.
