# ADR-008: Idempotency-Key como header opcional para endpoints públicos

> **Status:** aceptada
> **Fecha:** 2026-06-10
> **Decisores:** equipo + senior dev review

## Contexto

`POST /public/pedidos/{slug}` es no-idempotente por naturaleza: cada llamada crea un pedido nuevo. Pero el cliente público (Next.js en celular del cliente) puede sufrir:

- Red lenta — timeout del lado cliente antes de recibir 201, cliente reintenta, llegan dos pedidos.
- Background tab — Chrome a veces aborta y reintenta XHRs.
- Backoff del usuario impaciente que clickea "Confirmar" dos veces.

Sin protección, el local recibe 2 órdenes idénticas en su WhatsApp + duplica el descuento de inventario. Mala UX.

## Decisión

Implementar **header `Idempotency-Key`** (UUID v4) opcional:

- Cliente que mande el header → protegido contra duplicados (segunda llamada devuelve la misma respuesta cacheada).
- Cliente que NO lo mande → comportamiento legacy (cada request es un pedido nuevo).

Storage: tabla `idempotency_keys` con TTL 24h por entrada, unique `(key, endpoint)`.

Middleware: `App\Http\Middleware\Idempotency` (alias `idempotent:24h`).

## Alternativas consideradas

- **Hashing del payload + dedup por contenido** → descartada. Dos clientes legítimos podrían pedir lo mismo casualmente (mismo cliente_nombre, mismo producto, misma cantidad) — sería falso positivo.
- **No hacer nada / esperar reportes** → descartada. El daño (pedido duplicado al local) es de bajo bound pero alta probabilidad en red móvil mexicana.
- **Solo dedup de últimos 60s** → descartada. Demasiado heurístico, sin garantía contractual al cliente.
- **Tipo de cliente "smart vs dumb"** (sólo el frontend oficial manda key) → descartada. Defensive design: cualquiera puede pegar el endpoint, debería estar protegido.

## Por qué Idempotency-Key como pattern

- Estándar de la industria — Stripe API, Square, Plaid lo usan así.
- Hay [IETF draft](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-idempotency-key-header) para formalizarlo.
- Permite que cualquier cliente (no sólo nuestro frontend) se proteja.
- Backward-compatible: clientes legacy sin el header funcionan igual.

## Consecuencias

### Positivas

- **Cliente reintenta sin miedo** → mejora UX en red lenta.
- **El backend nunca duplica** — incluso bugs de retry-storm en el frontend están protegidos.
- **Trazabilidad**: cuando un cliente reporta "no me llegó la confirmación", podemos buscar por key en la tabla.

### Negativas

- **Una tabla más** que crece (mitigada con cron de cleanup — ver `bootstrap/app.php` schedule).
- **Una validación más** por request del endpoint público (~3ms overhead — query con index).
- **Frontend debe generar UUID por intent** — disciplina del cliente (documentado en `docs/features/idempotency.md`).

### Neutras

- El header `Idempotency-Replayed: true` en respuestas cacheadas permite al frontend distinguir "esto ya pasó" si lo necesita.

## Reglas críticas

1. **Sólo se cachean 2xx**. Errores transitorios pueden reintentarse legítimamente.
2. **Mismo key + body distinto = 409** (mal uso del cliente — el key debe ser único por payload).
3. **TTL 24h**: balance entre "cubrir todo intento razonable" y "no acumular para siempre".

## Cuándo reabrir

- Si se introduce otro endpoint no-idempotente (`POST /payments` cuando haya pagos online), aplicar el mismo middleware ahí.
- Si volumen de la tabla crece > 1M filas, considerar particionado por día.

Ver [`docs/features/idempotency.md`](../features/idempotency.md).
