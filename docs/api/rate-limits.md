# API — Rate limiting

## Capas

Hay dos capas configurando rate limiting:

### 1. `AppServiceProvider::configureRateLimiting`
Define el rate limiter nombrado `api`:
```php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)
        ->by($request->user()?->id ?: $request->ip());
});
```
60 requests/min por user_id (autenticado) o IP.

### 2. `routes/api.php` — throttle por grupo y por ruta
El grupo raíz aplica `throttle:60,1`. Rutas específicas añaden límites más estrictos:

| Ruta                                       | Throttle adicional |
|-------------------------------------------|--------------------|
| `POST /auth/register`                       | `5,1`              |
| `POST /auth/login`                          | `10,1` + guard manual de 5/min por IP+email |
| `PATCH /auth/me/password`                   | `5,1`              |
| `POST /public/pedidos/{slug}`               | `20,1`             |
| `POST /uploads/image`                       | `30,1`             |
| `PATCH /admin/locales/{id}/owner-password`  | `10,1`             |

Sintaxis `throttle:N,M` = N requests por M minutos.

## Guard manual en login

`AuthController::login` complementa el throttle con un contador propio (`RateLimiter::tooManyAttempts`) keyed por `login:<ip>:<email>`, decay 60s:

- Si supera 5 intentos fallidos → 429 con campo `errors.email` informando los segundos restantes.
- Hit en cada fallo (`Hash::check` falla o user no existe).
- Clear en el éxito.

## Headers de respuesta

El middleware throttle de Laravel inyecta automáticamente:

- `X-RateLimit-Limit` — el límite total
- `X-RateLimit-Remaining` — cuántos quedan
- `Retry-After` — segundos para reintentar (sólo en 429)

## Sugerencias / pendientes

Ver [`issues/funcionalidad-faltante.md`](../issues/funcionalidad-faltante.md):

- Rate limit **por tenant** (un local que recibe ataque no debería poder envenenar a otro al saturar la API).
- Rate limit más bajo en endpoints públicos pesados (`/public/menu/{slug}`).
- Captcha o proof-of-work en `POST /public/pedidos/{slug}` para evitar pedidos basura masivos.
