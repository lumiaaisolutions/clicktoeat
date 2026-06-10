# ADR-007: Polling cada 30s para notificaciones (interim, sin WebSockets)

> **Status:** aceptada interim — **a revisar** cuando se necesite tiempo real real
> **Fecha:** 2026-06-10
> **Decisores:** equipo inicial

## Contexto

El owner necesita ver pedidos nuevos y notificaciones de bajo stock sin tener que recargar la página. Latencia objetivo: del orden de **segundos**, no minutos.

Opciones:

1. **Polling HTTP** — fetch periódico a `/notificaciones`.
2. **Server-Sent Events** (SSE) — el server hace push por una conexión HTTP-streaming.
3. **WebSockets** vía Pusher / Laravel Reverb / Soketi.
4. **Long polling**.

## Decisión

Hoy: **polling HTTP cada 30 segundos** desde el frontend (`apps/web/src/store/notificaciones.ts:74`). Sin broadcasting backend. `BROADCAST_CONNECTION=log`.

## Alternativas consideradas

- **Pusher / Laravel Reverb desde el inicio** → descartada por fricción de setup (otro servicio, otra cuenta o contenedor) en un MVP donde el tiempo real "casi en vivo" (≤ 30s) era aceptable.
- **SSE** → considerada como camino intermedio, no implementada todavía. Es la opción más simple para upgradear porque sólo el server emite y no requiere infra extra.
- **Long polling** → técnicamente intermedia, descartada por complejidad sin ventaja clara sobre SSE.

## Consecuencias

### Positivas

- **Setup cero** en backend (no broadcasting, no canales privados, no auth de canal).
- Sin dependencia externa.
- Recuperación gratuita ante desconexiones (el siguiente tick reintenta).

### Negativas

- **Latencia hasta 30s** entre que llega un pedido y el owner lo ve.
- **Carga inútil**: 120 requests/hora por owner activo aunque no haya cambios. Multiplicado por N owners conectados.
- **No hay "ping" para que el owner sepa que sigue conectado** — si la API muere, el polling sigue fallando silenciosamente.
- **Sin alertas sonoras / push del SO** (la pestaña debe estar visible).

### Neutras

- El intervalo (30s) se puede bajar (más respuesta, más carga) o subir trivialmente; vive en `store/notificaciones.ts`.
- El endpoint `/notificaciones` devuelve tanto notificaciones como `pedidos_activos` en una sola llamada — diseñado para minimizar requests.

## Cuándo reabrir

- **Pronto** (próximas 6-10 semanas) → cualquiera de:
  - Owners reportan latencia frustrante.
  - Más de ~50 owners concurrentes (la carga acumulada empieza a notarse).
  - Se introducen features de tiempo real más exigentes (chat con el cliente, status del pedido).

## Migration path sugerido

### Opción A: Reverb (Laravel-nativo, sin servicio externo)

1. `composer require laravel/reverb`.
2. `php artisan reverb:install` → configura `BROADCAST_CONNECTION=reverb`, agrega `pusher-php-server`.
3. Crear evento broadcast `PedidoCreado` y disparar desde `OrderService` después del commit de transacción.
4. Canal privado `local.{local_id}` con auth en `routes/channels.php`.
5. Frontend: `laravel-echo` + `pusher-js`, suscribirse al canal.
6. **Mantener el polling como fallback** durante un periodo de transición.
7. Eventualmente subir el polling a 5 minutos como heartbeat / refresh garantizado.

### Opción B: SSE (más simple)

1. Endpoint `GET /notificaciones/stream` con `Content-Type: text/event-stream`.
2. Frontend: `new EventSource(url)`.
3. Server mantiene la conexión y publica eventos cuando los hay (probablemente apoyado en Redis pub/sub si hay múltiples instancias).
4. Sin canales privados complejos — auth del request inicial bastaría.

SSE es menos "moderno" pero suficiente para owner-server (unidireccional). Reverb deja la puerta abierta a chat bidireccional futuro.

## Trade-off final del interim

Hoy el costo del polling es bajo (pocos owners). El día que duela, se migra. Esta decisión está **diseñada para ser reemplazada**.

Ver [`docs/features/notificaciones.md`](../features/notificaciones.md).
