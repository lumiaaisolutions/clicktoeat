# /health/deep — endpoint extendido de health

`GET https://clicktoeat-api.lumiaaisolutions.com/api/v1/health/deep`

Diferente del `/up` (liveness simple de Laravel 11). Este verifica:
- **database** — `SELECT 1` contra la BD.
- **cache** — write/read en el driver configurado (database por default).
- **storage** — write/delete en disco `local`.
- **stripe** — `accounts->retrieve()` si hay `STRIPE_SECRET` setado.

## Respuesta exitosa

```json
{
  "status": "ok",
  "app": "ClickToEat",
  "env": "production",
  "version": "dev",
  "checks": {
    "database": { "status": "ok", "latency_ms": 1.2, "driver": "mysql" },
    "cache":    { "status": "ok", "latency_ms": 0.8, "driver": "database" },
    "storage":  { "status": "ok", "latency_ms": 5.4, "disk": "local" },
    "stripe":   { "status": "ok", "latency_ms": 320.1, "mode": "live" }
  },
  "response_ms": 332.5,
  "timestamp": "2026-06-15T22:00:00Z"
}
```

HTTP 200 si **todos** los checks pasan. HTTP 503 si **alguno** falla.

## Respuesta con error

```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "ok", ... },
    "stripe":   { "status": "error", "latency_ms": 5012, "error": "Could not connect..." }
  }
}
```

## Configurar uptimerobot

1. https://uptimerobot.com → Add New Monitor
2. **Monitor Type**: HTTP(s)
3. **URL**: `https://clicktoeat-api.lumiaaisolutions.com/api/v1/health/deep`
4. **Monitoring Interval**: 5 minutos
5. **Alert Contacts**: tu email/Slack
6. **Avanzado** → Keyword (opcional): `"status":"ok"` — esto te alerta también si algún componente falla aunque el HTTP sea 200 (más estricto).

## Rate limit

`throttle:30,1` — 30 requests/min por IP. Suficiente para múltiples monitores.

## Si /health/deep falla con 503

- **database error** → BD caída o credenciales mal. Revisar `DB_*` en `.env`.
- **cache error** → tabla `cache` no migrada o permisos. `php artisan cache:clear`.
- **storage error** → permisos del directorio `storage/app/`. `chmod 775 -R storage/`.
- **stripe error** → key inválida o sin internet. Revisar `STRIPE_SECRET`.

`/up` puede responder 200 aunque `/health/deep` esté 503 — `/up` es liveness, no readiness.
