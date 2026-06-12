# ADR-010: Rate limit por tenant en endpoints públicos críticos

> **Status:** aceptada
> **Fecha:** 2026-06-10
> **Decisores:** equipo + senior dev review

## Contexto

`POST /public/pedidos/{slug}` tenía `throttle:20,1` (20/min por IP). Problema: un local bajo ataque DDoS / scraping podía resentir si todos los attempts vienen del mismo IP (caso fácil de mitigar) **o** un local podía afectar a otros indirectamente si saturaba recursos compartidos.

Más sutil: el throttle por IP **no protege al local específico** — si un atacante usa 1000 IPs rotando, mete 1000 pedidos basura al local sin disparar el throttle. El local sufre WhatsApp inundado + inventario descontado erróneamente.

## Decisión

Limiter custom `public-orders-by-tenant` en `AppServiceProvider::configureRateLimiting`:

- **100 pedidos/min por `local:{slug}`** (clave es el local, no la IP).
- **20 pedidos/min por IP** (fallback — protege contra atacante con un solo IP).

Ambos límites se chequean — el más restrictivo gana. Aplicado a `POST /public/pedidos/{slug}` reemplazando el `throttle:20,1` simple.

## Alternativas consideradas

- **Mantener throttle por IP solo** → descartada. No protege escenarios con muchas IPs (botnet, proxies, NAT).
- **Captcha tras N requests** → considerada para más adelante. Hoy demasiada fricción UX para pedidos legítimos.
- **WAF (Cloudflare)** → complementaria, no reemplazo. Si se introduce, **mantener** este limiter como defensa en profundidad.
- **Throttle dinámico** (más estricto fuera de horario del local) → too clever. Empezar simple.
- **Throttle global compartido por tenants** → no quería que un local malo afecte a otros. La key incluye slug.

## Por qué los números

- **100/min por local**: razonable para un local pico (sábado noche). Tacos El Gordo realista hace 5-15/min. 100 da headroom 7x.
- **20/min por IP**: mismo límite que el throttle original, mantiene la defensa contra un IP malicioso.

Ajustables — si un local crece a > 100 pedidos/min legítimos sostenidos, subir el límite por config.

## Consecuencias

### Positivas

- **Atacante con muchas IPs** se topa con el límite por tenant.
- **Atacante con un IP** se topa con el límite por IP.
- **Locales pequeños no se ven afectados** por bursts de otros locales.
- **Trazable** — `429` con header `X-RateLimit-Limit` indica cuál límite se golpeó.

### Negativas

- **Falsos positivos en eventos virales**: si un influencer comparte la URL del local y miles entran al mismo tiempo, podrían chocar el límite. Mitigación: subir el límite para esos casos puntuales antes del evento, o pasar a configurable por local.
- **Sigue siendo defendible por una botnet grande con muchas IPs únicas y volumen distribuido**. Para eso → WAF / Cloudflare en frente.

### Neutras

- Sin coste — Laravel's `RateLimiter` usa el cache backend ya existente (database).

## Próximos pasos (cuando se justifique)

- **Configurable por local** (campo `local.rate_limit_per_min` o similar) — para locales premium.
- **Captcha** (hCaptcha / Cloudflare Turnstile) si se detecta abuso recurrente.
- **WAF** delante (Cloudflare en modo "Under Attack" cuando hace falta).

## Cuándo reabrir

- Si un local crece > 100/min legítimos sostenidos.
- Si se introduce pagos online — endpoint relacionado necesita su propio limiter.
- Si la métrica de 429s del log muestra falsos positivos > 1% del total.

Ver [`docs/api/rate-limits.md`](../api/rate-limits.md).
