# Glosario

Términos del dominio. Para vocabulario técnico ver los `docs/architecture/`.

## Negocio

- **Local** — un negocio de comida en la plataforma. Es el **tenant**.
- **Owner** — dueño de un local. CRUD completo.
- **Staff** — empleado de un local. Atiende pedidos, ajusta stock.
- **Super admin** — admin global de ClickToEat. Crea/suspende locales, resetea passwords.
- **Cliente** — persona que pide desde la landing pública. **No tiene cuenta** en la plataforma.
- **Landing** — la página pública por local, accesible en `/{slug}`. Contiene el menú.
- **Slug** — identificador URL del local (`tacos-el-gordo`).
- **Pickup** — el cliente recoge en sucursal.
- **Delivery** — el local lleva el pedido al cliente.
- **Sucursal** — venta presencial; el cliente está físicamente en el local.
- **POS** — punto de venta interno; ventas presenciales registradas desde el panel.
- **Mostrador** — cliente default cuando una venta sucursal no captura datos del cliente.

## Pedido

- **Folio** — código legible único del pedido, formato `CE-XXXXXX`.
- **Snapshot** — copia del nombre/precio del producto en `detalle_pedidos`, congelada al crear.
- **Reintegro** — devolver al stock lo descontado por un pedido cancelado.

## Inventario

- **Ingrediente** — materia prima controlada por stock.
- **Receta** — conjunto de ingredientes (o productos componentes) que consume un producto al venderse.
- **Producto componente** — producto que actúa como ingrediente compuesto de otro (combos, productos armados).
- **Movimiento de inventario** — fila de auditoría por cada cambio de stock.
- **Promedio ponderado** — método de cálculo del `costo_unitario` al recibir nueva mercancía.
- **Bajo stock** — ingrediente con `stock <= stock_minimo`.
- **Merma** — pérdida por daño / vencimiento / desperdicio.
- **Ajuste** — corrección manual del stock (positivo o negativo).

## Compras

- **Compra** — registro de mercancía recibida del proveedor. Código `CP-XXXXXX`.
- **Anulación** — marcar una compra como `anulada` + revertir su efecto en stock (si todavía es posible).
- **Costo unitario** — precio actual (ponderado) por unidad del ingrediente.
- **Referencia factura** — número del documento del proveedor.

## Estados de pedido

| Estado          | Quién lo pone                              |
|----------------|---------------------------------------------|
| `nuevo`        | Backend al crear                            |
| `confirmado`    | Owner/staff manualmente — o auto si POS sucursal |
| `preparando`    | Owner/staff                                 |
| `listo`         | Owner/staff                                 |
| `en_camino`     | Owner/staff (sólo para delivery)             |
| `entregado`     | Owner/staff                                 |
| `cancelado`     | Owner/staff — dispara reintegro de inventario |

## Identidad visual

- **Branding** — colores, logo, banner, tipografía y dark mode del local.
- **CSS vars** — variables CSS (`--ce-accent`, `--ce-ink`, etc.) que cambian según branding.

## Términos del código

- **TenantContext** — singleton que guarda el `local_id` activo del request.
- **GlobalScope** — scope Eloquent que se aplica automáticamente a queries.
- **BelongsToTenant** — trait que aplica `TenantScope` + autofill de `local_id`.
- **`super_admin`** — bypassea TenantScope (no setea el contexto).
- **`withoutTenantScope()`** — query sin el filtro automático. Acompañar siempre de un `where('local_id', ...)` explícito.
- **`storage:link`** — symlink Laravel para servir `storage/app/public` desde `public/storage`.

## Acrónimos

- **POS** — Point of Sale.
- **TPV** — Terminal Punto de Venta (España/MX).
- **SaaS** — Software as a Service.
- **TZ** — Time Zone.
- **TTL** — Time To Live.
- **FK** — Foreign Key.
- **MFA** — Multi-Factor Authentication.
- **PWA** — Progressive Web App.
- **RSC** — React Server Component.
- **OG** — Open Graph.
- **ADR** — Architecture Decision Record.
