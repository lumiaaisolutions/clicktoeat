# API — Resources (forma de respuesta)

Cada modelo expuesto al exterior pasa por un `Resource` que decide qué campos salen, en qué tipo y con qué nombre.

`apps/api/app/Http/Resources/`

## Convenciones

- Casts numéricos explícitos a `(float)` / `(int)` / `(bool)` para evitar que Eloquent regrese strings.
- Fechas: `?->toIso8601String()` (devuelve `null` si la columna es null).
- Relaciones vía `whenLoaded(...)` o `whenCounted(...)` — nunca cargar relaciones que no se pidieron.
- Resources de listas internas: `Resource::collection($paginated)` mantiene el paginator wrapper.

## Resources internos (snake_case)

| Resource                          | Notas                                                          |
|----------------------------------|----------------------------------------------------------------|
| `CategoriaResource`               | + `productos_count` cuando se cargó con `withCount`             |
| `ProductoResource`                | `categoria` cargada vía `whenLoaded`; `extras` default `[]`     |
| `IngredienteResource`             | calcula `bajo_stock` (boolean); `recetas_count` opcional        |
| `PedidoResource`                  | incluye `whatsapp_url`, `detalles` cuando cargada                |
| `DetallePedidoResource`           | snapshot fields                                                  |
| `MovimientoInventarioResource`    | usuario opcional                                                 |
| `CompraResource`                  | detalles + usuario opcionales                                    |
| `DetalleCompraResource`           | incluye `{id, nombre, unidad}` del ingrediente                   |
| `RecetaResource`                  | `tipo = 'ingrediente' \| 'componente'` derivado                  |
| `NotificacionResource`            | `leida` (boolean derivado de `leida_at`)                         |
| `LocalResource`                   | incluye `public_url` calculada desde `FRONTEND_URL`              |

## Resource público (camelCase)

| Resource                          | Endpoint                                       |
|----------------------------------|------------------------------------------------|
| `Public/MenuResource`             | `/public/locales` — directorio                  |

Campos: `slug`, `nombre`, `tagline`, `logo`, `banner`, `colorPrimario`, `colorSecundario`, `direccion`, `whatsapp`, `horarios`, `estado` (calculado por `HorarioCalculator`), `deliveryFee`, `deliveryMinutos`, `deliveryRadioKm`, `lat`, `lng`, `redesSociales`, `productosCount`.

> `/public/menu/{slug}` **no** usa Resource — el controller arma el array a mano para tener control fino sobre la estructura camelCase del menú (branding, categorias, productos como sub-arrays).

## Cargar campos extra ad-hoc

Cuando hace falta añadir un campo a una sola respuesta (no a todas), se usa `additional()`:

```php
return (new PedidoResource($pedido->load('detalles')))
    ->additional([ 'whatsapp_url' => $pedido->whatsapp_url ])
    ->response()
    ->setStatusCode(201);
```

Aparece en el JSON al mismo nivel que `data`.

## Decisión: por qué hay dos convenciones

- Resources internos (snake_case) preservan el shape de la BD — útil para CRUDs sin transformación adicional en frontend.
- Menu público (camelCase) consume directamente el shape esperado por componentes React/landing — evita transformaciones en runtime, encaja con prop naming convencional de TS/React.

**Pendiente:** decidir si se unifica. Si se mantiene la dualidad, escribir un ADR.
