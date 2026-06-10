# Base de datos — ERD

> Diagrama mermaid renderizable + ASCII complementario. GitHub y la mayoría de viewers Markdown modernos renderean el `mermaid` automáticamente.

## Mermaid (renderizado)

```mermaid
erDiagram
    LOCALES ||--o{ USERS               : "1:N (staff + 1 owner)"
    LOCALES ||--o{ CATEGORIAS          : ""
    LOCALES ||--o{ PRODUCTOS           : ""
    LOCALES ||--o{ INGREDIENTES        : ""
    LOCALES ||--o{ PEDIDOS             : ""
    LOCALES ||--o{ COMPRAS             : ""
    LOCALES ||--o{ MOV_INVENTARIO      : ""
    LOCALES ||--o{ NOTIFICACIONES      : ""
    LOCALES }o--|| USERS               : "owner_id"

    CATEGORIAS ||--o{ PRODUCTOS        : ""

    PRODUCTOS ||--o{ RECETAS           : "componente principal"
    PRODUCTOS ||--o{ RECETAS           : "componente compuesto"
    INGREDIENTES ||--o{ RECETAS        : "puntero alternativo"

    PEDIDOS ||--o{ DETALLE_PEDIDOS     : ""
    PRODUCTOS ||--o{ DETALLE_PEDIDOS   : "FK nullable (snapshot sobrevive)"

    COMPRAS ||--o{ DETALLE_COMPRAS     : ""
    INGREDIENTES ||--o{ DETALLE_COMPRAS : ""

    INGREDIENTES ||--o{ MOV_INVENTARIO : ""
    USERS ||--o{ MOV_INVENTARIO        : "FK nullable (auto si no hay user)"
    USERS ||--o{ COMPRAS               : "FK nullable"

    LOCALES {
        bigint id PK
        string slug UK
        string nombre
        string whatsapp
        string color_primario
        string color_secundario
        string color_fondo
        string tipografia
        json horarios
        decimal delivery_fee
        smallint delivery_radio_km
        json metodos_pago
        bool activo
        bool suspendido
        bool cerrado_temporal
        string zona_horaria
        bigint owner_id FK
    }
    USERS {
        bigint id PK
        string email UK
        string password
        enum rol "super_admin|owner|staff"
        bigint local_id FK
    }
    CATEGORIAS {
        bigint id PK
        bigint local_id FK
        string slug
        smallint orden
        bool activo
    }
    PRODUCTOS {
        bigint id PK
        bigint local_id FK
        bigint categoria_id FK
        string slug
        decimal precio
        decimal precio_descuento
        string imagen_url
        string imagen_public_id
        bool disponible
        json extras
        smallint orden
    }
    RECETAS {
        bigint id PK
        bigint producto_id FK
        bigint ingrediente_id FK "nullable - XOR"
        bigint componente_producto_id FK "nullable - XOR"
        decimal cantidad
    }
    INGREDIENTES {
        bigint id PK
        bigint local_id FK
        decimal stock
        decimal stock_minimo
        string unidad "pz|kg|g|l|ml"
        decimal costo_unitario
        bool activo
    }
    PEDIDOS {
        bigint id PK
        string codigo UK "CE-XXXXXX"
        bigint local_id FK
        string cliente_nombre
        string cliente_telefono
        enum metodo_entrega "pickup|delivery|sucursal"
        enum metodo_pago "efectivo|tarjeta_entrega|tarjeta_tpv|transferencia"
        decimal subtotal
        decimal delivery_fee
        decimal total
        enum estado "nuevo|confirmado|preparando|listo|en_camino|entregado|cancelado"
        text whatsapp_url
        timestamp confirmado_at
        timestamp entregado_at
    }
    DETALLE_PEDIDOS {
        bigint id PK
        bigint pedido_id FK
        bigint producto_id FK "nullable - snapshot sobrevive"
        string producto_nombre "SNAPSHOT"
        decimal precio_unitario "SNAPSHOT"
        smallint cantidad
        decimal subtotal
        json extras_seleccionados
    }
    MOV_INVENTARIO {
        bigint id PK
        bigint local_id FK
        bigint ingrediente_id FK
        enum tipo "entrada|salida|ajuste|merma"
        decimal cantidad
        decimal stock_resultante
        string referencia "pedido:N|compra:N|alta|manual"
        bigint user_id FK
    }
    COMPRAS {
        bigint id PK
        string codigo UK "CP-XXXXXX"
        bigint local_id FK
        string proveedor
        date fecha
        decimal subtotal
        decimal impuestos
        decimal total
        enum estado "registrada|anulada"
        bigint user_id FK
    }
    DETALLE_COMPRAS {
        bigint id PK
        bigint compra_id FK
        bigint ingrediente_id FK
        decimal cantidad
        decimal costo_unitario
        decimal subtotal
    }
    NOTIFICACIONES {
        bigint id PK
        bigint local_id FK
        string tipo
        string titulo
        text mensaje
        json data
        timestamp leida_at
    }
```

> El diagrama mermaid arriba muestra estructura + cardinalidades + columnas clave. El bloque ASCII abajo es la versión "text-only" tradicional, conservada para terminal-friendly y diff legible.

## ASCII (terminal-friendly)


```
                        ┌──────────────────┐
                        │     locales      │ ◄── (tenant raíz)
                        │ id, slug UNIQ    │
                        │ branding, redes  │
                        │ delivery_fee/km  │
                        │ horarios JSON    │
                        │ cerrado_temporal │
                        │ owner_id ─────────┐
                        └────────┬─────────┘│
                                 │ 1:N      │
       ┌─────────────────────────┼──────────┼─────────────────────────┐
       │                         │          │                         │
       ▼                         ▼          ▼                         ▼
┌──────────────┐   ┌─────────────────┐  ┌──────────┐         ┌────────────────┐
│  categorias  │   │ ingredientes    │  │  users   │         │   pedidos      │
│ id, local_id │   │ id, local_id    │  │ id       │         │ id, local_id    │
│ slug, orden  │   │ stock, unidad   │  │ email    │         │ codigo UNIQ     │
└──────┬───────┘   │ costo_unitario  │  │ rol enum │         │ cliente_* (text)│
       │ 1:N       └──────┬──────────┘  │ local_id │         │ estado enum     │
       ▼                  │ 1:N         └──────────┘         │ whatsapp_url    │
┌──────────────┐          │                                  └────────┬────────┘
│  productos    │         │                                            │ 1:N
│ id, local_id  │         │                                            ▼
│ categoria_id  │◄────────┘                              ┌─────────────────────┐
│ slug, precio  │      ┌─────────────────┐                │  detalle_pedidos    │
│ extras JSON   │      │ mov_inventario  │                │ id, pedido_id       │
│ disponible    │      │ id, local_id    │                │ producto_id (null)  │
│ imagen_*      │      │ ingrediente_id  │                │ producto_nombre*    │
└──────┬───────┘      │ tipo enum       │                │ precio_unitario*    │
       │ 1:N          │ cantidad +/-     │                │ cantidad, subtotal  │
       ▼              │ stock_resultante│                │ extras_sel JSON     │
┌──────────────┐      │ referencia      │                └─────────────────────┘
│   recetas    │      │ user_id (null)  │
│ producto_id  │      └──────────────────┘                  * = snapshot
│ ingrediente_id (null)
│ componente_producto_id (null) ──► productos.id
│ cantidad
└──────────────┘
                                                          ┌──────────────────┐
                                                          │  notificaciones  │
                                                          │ id, local_id     │
                                                          │ tipo, titulo     │
                                                          │ data JSON        │
                                                          │ leida_at         │
                                                          └──────────────────┘

  ┌──────────────┐                ┌────────────────────┐
  │   compras    │                │  detalle_compras   │
  │ id, codigo   │ 1:N            │ compra_id          │
  │ local_id     │ ─────────────► │ ingrediente_id     │
  │ proveedor    │                │ cantidad           │
  │ fecha,estado │                │ costo_unitario     │
  │ user_id      │                │ subtotal           │
  └──────────────┘                └────────────────────┘
```

## Cardinalidades

- `locales 1:N users` (un local puede tener varios staff, **un solo owner** por convención).
- `locales 1:N categorias 1:N productos`.
- `productos M:N ingredientes` vía `recetas`. Una receta puede apuntar a otro **producto** (componente compuesto) en vez de a un ingrediente.
- `locales 1:N pedidos 1:N detalle_pedidos`.
- `productos 0:N detalle_pedidos` (la FK puede quedar NULL si el producto se borra — el detalle sobrevive por el snapshot).
- `locales 1:N ingredientes 1:N movimientos_inventario`.
- `locales 1:N compras 1:N detalle_compras`. Cada `detalle_compra` apunta a un ingrediente.
- `locales 1:N notificaciones`.

## Patrón "snapshot"

`detalle_pedidos` guarda `producto_nombre` y `precio_unitario` aunque el `producto_id` exista. Razón: los productos pueden renombrarse, subir precio o eliminarse — el histórico de pedidos no debe romperse. Ver [`features/pedidos.md`](../features/pedidos.md).

## Patrón "referencia textual"

`movimientos_inventario.referencia` es un string que codifica el origen del movimiento:

| Valor                              | Significado                          |
|-----------------------------------|--------------------------------------|
| `pedido:N`                         | Salida automática por pedido N        |
| `pedido:N:reintegro`               | Entrada por cancelación del pedido N  |
| `compra:N`                         | Entrada por compra N                  |
| `compra:N:anulacion`               | Salida por anulación de compra N      |
| `alta`                             | Stock inicial al crear el ingrediente |
| `manual`                           | Ajuste/merma/entrada manual           |

Este patrón evita una tabla polimórfica + permite queries `WHERE referencia LIKE 'pedido:%'`. Idempotencia (ej. evitar reintegros duplicados) verifica existencia de la `referencia` específica.
