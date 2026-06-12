# Feature — Idempotency-Key

> Cierra el vector: cliente con red lenta reintenta `POST /public/pedidos/{slug}` y termina creando 2 pedidos por error.

## Cómo funciona

El middleware `App\Http\Middleware\Idempotency` (alias `idempotent`) intercepta requests POST que llevan header `Idempotency-Key: <uuid>`:

```
Cliente                          Backend (Idempotency middleware)
  │                                       │
  │  POST /public/pedidos/{slug}          │
  │  Idempotency-Key: a1b2c3d4-...        │
  │  body = {...}                          │
  ├──────────────────────────────────────►│
  │                                       │  ¿key + endpoint en idempotency_keys?
  │                                       │
  │                                       ├── NO  → procesar normal, cachear response
  │                                       │
  │                                       ├── SÍ + mismo body
  │                                       │       → devolver response cacheada
  │                                       │         + header `Idempotency-Replayed: true`
  │                                       │
  │                                       └── SÍ + body distinto
  │                                               → 409
  │  201 + data                          │
  ◄──────────────────────────────────────┤
```

## Tabla `idempotency_keys`

| Columna        | Tipo            | Para qué                              |
|---------------|-----------------|---------------------------------------|
| `id`           | bigint PK        |                                       |
| `key`          | varchar(80) idx  | UUID del cliente                       |
| `endpoint`     | varchar(100)     | `POST:/public/pedidos/{slug}` (verbo + path) |
| `request_hash` | varchar(64)      | sha256 del body normalizado            |
| `status_code`  | smallint         | 2xx cacheado                           |
| `response_body`| longtext         | JSON serializado para replay           |
| `created_at`   | timestamp        |                                       |
| `expires_at`   | timestamp idx    | TTL — por default 24h                  |

UNIQUE `(key, endpoint)`.

## Reglas

- **Sólo se cachean respuestas 2xx**. Errores no se cachean (un 409 transitorio no debe bloquear reintentos legítimos).
- **TTL configurable** vía argumento del middleware: `idempotent:24h`, `idempotent:7d`, `idempotent:30m`.
- **Key inválida** (caracteres raros, muy corta) → 400 con mensaje.
- **Sin header** → comportamiento legacy (sin idempotencia). Clientes viejos no se rompen.

## Uso desde el frontend

`apps/web/src/lib/api.ts` debe generar un UUID por intent del usuario y mantenerlo durante reintentos:

```ts
import { v4 as uuidv4 } from 'uuid';

async function crearPedido(slug: string, body: PedidoBody): Promise<PedidoResponse> {
  const idempotencyKey = uuidv4();   // un nuevo UUID por cada intent del checkout

  return retryWithBackoff(() =>
    api.post(`/public/pedidos/${slug}`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  );
}
```

**Importante**: el UUID se genera **una sola vez** por intento del usuario. Si el usuario reintenta clickeando "Confirmar pedido" de nuevo, debe ser otro UUID (es otro intent).

## Endpoint(s) cubiertos

| Endpoint                             | Aplicado |
|-------------------------------------|----------|
| `POST /public/pedidos/{slug}`        | ✅ `idempotent:24h` |
| `POST /pedidos` (POS interno)        | ❌ No requerido (operación humana, no reintenta) |

## Cleanup (pendiente)

Las filas con `expires_at < now()` se acumulan. Cuando se introduzca el scheduler (`Console/Kernel.php`):

```php
$schedule->call(function () {
    \DB::table('idempotency_keys')->where('expires_at', '<', now())->delete();
})->daily();
```

## Tests

`tests/Feature/IdempotencyTest.php` cubre:
- Sin header: comportamiento legacy.
- Mismo key + mismo body: respuesta cacheada + header `Idempotency-Replayed`.
- Mismo key + body distinto: 409.
- Keys distintas: pedidos distintos.
- Key inválida: 400.
- Errores no se cachean.

## Referencias

- [Stripe API — Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
- [IETF draft — Idempotency-Key Header](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header)
