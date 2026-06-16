# Programa de lealtad

Sistema de sellos por cliente. Cuando el local activa lealtad y un cliente deja su email al pedir, le suma un sello automáticamente. Al completar la meta (X sellos) el cliente "gana" un premio que el local entrega físicamente en el siguiente pedido.

## Cómo se activa

`/admin/branding` → sección "Programa de lealtad":

- **Activar programa de sellos** — toggle.
- **Cuántos sellos para un premio** — número entre 3 y 50 (default 10).
- **Qué premio das** — texto libre (ej. "Café gratis", "Postre del mes", "20% de descuento").

Guarda y se publica en la landing inmediatamente.

## Cómo funciona para el cliente

Cuando el cliente está en checkout y deja su correo, debajo del input aparece:

- **Cliente nuevo**: banner promocional "🎁 Programa de lealtad: con tu correo acumulas sellos…"
- **Cliente con N sellos**: barra de progreso N/meta con sellos visuales (`█████░░░░░`)
- **Premio listo**: "🏆 ¡Tienes 1 premio pendiente! Reclama en tu próxima visita: <premio>"

Endpoint público: `POST /public/lealtad/{slug}/status` con `{email}`.

## Cómo lo ve el owner

Cuando llega un pedido cuyo cliente acaba de completar el ciclo de sellos, el card del pedido en `/admin/pedidos` muestra:

> 🎁 Premio listo — regálale algo

El owner debe entregarle el premio físicamente. El sistema no descuenta automáticamente del cobro porque el premio puede ser algo no monetario (un postre cortesía).

## Modelo de datos

### Tabla `lealtad_sellos`

```sql
id, local_id, cliente_email, cliente_nombre,
count, redimidos_total, last_pedido_at,
created_at, updated_at
UNIQUE (local_id, cliente_email)
```

`count` es acumulativo perpetuo. Para saber el progreso del ciclo actual:
```php
$current = $count % $meta;       // 0 = recién redimido, $meta-1 = a uno de ganar
$ganados = intdiv($count, $meta); // cuántos premios ganó en total
```

### Columnas extra en `locales`

```sql
lealtad_activo BOOLEAN DEFAULT 0
lealtad_meta SMALLINT DEFAULT 10
lealtad_premio VARCHAR(120) NULLABLE
```

### Columna extra en `pedidos`

```sql
lealtad_premio_listo BOOLEAN DEFAULT 0
```

Se setea en `OrderService::crear` cuando `LoyaltyService::registrarPedido` devuelve `true` (es decir, este pedido completó un ciclo).

## Servicios

- **`App\Services\Loyalty\LoyaltyService`**
  - `registrarPedido(Pedido $p): bool` — suma sello, retorna `true` si premio ganado
  - `statusPara(Local $l, string $email): ?array` — estado para mostrar al cliente

Llamado desde `OrderService::crear` después de la transacción del pedido. Si falla, se reporta pero no rompe el pedido.

## GDPR / borrado

El endpoint `/public/borrar-mis-datos` (F81) borra también los registros de `lealtad_sellos` que coincidan con el email.
