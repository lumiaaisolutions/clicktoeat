# Bug — Rate limit 3-capas no se dispara en producción  → **FALSA ALARMA (RESUELTO 2026-09-07)**

> ## ✅ Resolución (2026-09-07)
>
> **No había ningún bug.** El rate limiter de 3 capas funciona correctamente
> en producción (VPS dedicado, php8.4-fpm, `CACHE_STORE=database`). El
> "síntoma" era un **error del script de reproducción**: usaba
> `"password":"bad"` (3 caracteres), pero `LoginRequest` valida
> `password => min:6`. Por eso **cada request devolvía 422 en la validación
> del FormRequest, antes de entrar al método** `login()` — el código del
> rate limiter (que vive en el cuerpo del método) nunca se ejecutaba, así que
> nunca acumulaba contadores. Las 4 hipótesis de abajo (LSPHP workers, CDN,
> cache prefix) eran callejones sin salida.
>
> **Verificación con password válido (≥6 chars)** el 2026-09-07 en ambos
> productos: 8 intentos → **5×422 (credenciales inválidas) → 3×429** (rate
> limit por email a partir del 6º). Exactamente lo esperado.
>
> ```bash
> for i in $(seq 1 8); do curl -s -o /dev/null -w "%{http_code}\n" \
>   -X POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/auth/login \
>   -H "Content-Type: application/json" -H "Accept: application/json" \
>   -d '{"email":"probe@example.com","password":"badpass1"}'; done
> # → 422 422 422 422 422 429 429 429
> ```
>
> Diagnóstico que lo confirmó: en `tinker` del VPS, `RateLimiter::hit`/
> `attempts` persisten cross-proceso (attempts=2), y `Cache` database
> persiste cross-proceso — pero los 8 logins con password corto dejaban
> **0 keys** `login:*` en la tabla `cache` (nunca corrían). Con password
> válido, los contadores aparecen y el 429 dispara.
>
> **Lección:** todo test de rate limit de login debe usar un password que
> pase la validación del `LoginRequest` (`min:6`), o estará midiendo la
> validación, no el limiter. La defensa anti-credential-stuffing por email
> (5/15min) **sí está activa**.
>
> ---
> _Lo de abajo es el análisis original de 2026-06-22 (obsoleto), conservado
> como registro._

# (Histórico) Bug — Rate limit 3-capas no se dispara en producción

> Detectado al verificar el deploy del 2026-06-22. El código de SEV-10
> (rate limit 3 capas en login) está deployado correctamente pero no
> acumula contadores en prod. En local + phpunit funciona.

## Síntoma

8 intentos consecutivos de login con creds inválidas + mismo email:

```bash
for i in {1..8}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/auth/login \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"ratetest@example.com","password":"bad"}'
done
```

Resultado: **8x 422** (todos invalid credentials).
Esperado: **5x 422 → 3x 429** (rate limit por email a partir del 6º).

## Verificaciones

- ✅ Código deployado correcto: `grep emailKey` en prod muestra los 3
  keys (email/ip/global) con los limits correctos (5/50/5000).
- ✅ phpunit en local pasa con tests del rate limit.
- ✅ Cache driver es database (`CACHE_STORE=database`).
- ✅ Tabla `cache` existe en MySQL prod.

## Hipótesis (no confirmadas — investigación pendiente)

1. **Cache prefix mismatch**: Laravel agrega prefix `laravel_cache_` por
   default. Si entre requests el prefix se computa distinto (por workers
   distintos de Passenger o LSPHP), las keys no coinciden.
2. **RateLimiter::hit() vs ::attempts()** comportamiento distinto en
   prod: el contador no persiste para `tooManyAttempts` porque la
   función interna usa una key distinta.
3. **Race condition con `throttle:30,1`** de la ruta: cuando llega el
   request, primero pasa por `throttle:30,1` (IP-based, 30/min) que
   tiene su propia lógica de cache. Posiblemente está incrementando
   contadores en el mismo namespace y confundiendo el mío.
4. **CDN/Proxy interference**: Hostinger CDN (hcdn) puede estar
   re-routeando requests entre workers que no comparten cache
   correctamente.

## Impacto

- **No es bug de seguridad activo**: el endpoint sigue requiriendo creds
  válidas. Credential stuffing es posible pero NO más fácil que antes
  del audit — antes existía rate limit single-layer (IP+email/60s) que
  tampoco protegía contra atacantes distribuidos.
- **Mitigaciones existentes** que SÍ funcionan en prod:
  - `throttle:30,1` middleware en la ruta → 30/min por IP (Laravel core).
  - Sanctum tokens ahora expiran a 7 días.
  - Sentry está capturando intentos fallidos masivos.
- **Pérdida real**: la defensa contra credential stuffing por email
  específico (5/15min) no está activa. Pero ningún hallazgo del audit
  decía que ESTE limit sería 100% efectivo — era una capa adicional.

## Pasos para diagnosticar

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html

# 1. Ver si la cache table tiene entries
php artisan tinker --execute="dd(DB::table('cache')->where('key', 'like', '%login%')->get());"

# 2. Verificar si RateLimiter funciona en general
php artisan tinker --execute="
  RateLimiter::hit('debug-test', 60);
  RateLimiter::hit('debug-test', 60);
  echo RateLimiter::attempts('debug-test') . PHP_EOL;
"
# Esperado: 2

# 3. Si tinker muestra 2 pero el endpoint no acumula, hay algo entre
#    requests HTTP que rompe la persistencia. Posible LSPHP worker
#    isolation.
```

## Workaround mientras se investiga

NO requiere acción urgente. Las defensas existentes (`throttle:30,1` +
Sanctum 7d expiration + Sentry alerting) cubren la mayoría del risk.

Si quieres endurecer mientras tanto:

1. Cambiar `throttle:30,1` a `throttle:10,1` en la ruta de login —
   reduce el cap general a 10/min por IP. Compromiso UX (puede afectar
   un usuario legítimo que typea mal). Edit en `apps/api/routes/api.php`:
   ```php
   Route::post('auth/login', [AuthController::class, 'login'])
       ->middleware('throttle:10,1');   // antes era 30,1
   ```
2. O agregar Cloudflare Turnstile invisible (ya documentado como
   opción en el roadmap del audit).

## Estado

- 📅 Detectado: 2026-06-22 deploy verification
- 🔍 Investigación pendiente: SSH + tinker para confirmar hipótesis #1-#4
- 🟢 NO bloquea producción
