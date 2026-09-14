# Anti-bot — Cloudflare Turnstile (login + registro)

CAPTCHA invisible de Cloudflare, **gated por variables de entorno**. Sin llaves
configuradas todo es **no-op** (auth idéntica a hoy). Implementado sept 2026.

> **✅ ACTIVO EN PRODUCCIÓN (2026-09-13).** Widget "ClickToEat" (modo *Managed*)
> creado en la cuenta Cloudflare de LUMIA, hostnames `clicktoeat.lumiaaisolutions.com`
> + `localhost`. Site key pública en `apps/web/.env.production`
> (`0x4AAAAAAEyNM0h4DgGXGxIi`); Secret key solo en `apps/api/.env` de prod (nunca en
> el repo). Verificado en vivo: `register` sin token → `422 CAPTCHA_REQUIRED`, y el
> widget renderiza + pasa el challenge en `/registro`.

## Comportamiento
- **Registro** (`AuthController@register`, `SignupController@prospect`): con secret
  configurado exige `turnstile_token` válido SIEMPRE (los bots crean cuentas al
  primer intento).
- **Login** (`AuthController@login`): sólo tras **≥3 fallos** de esa cuenta/IP en
  la ventana del rate-limit. Usuarios normales (0-2 fallos) no ven captcha. La
  respuesta de credenciales inválidas devuelve `captcha_required: true` al llegar
  al umbral; el front muestra el widget entonces.
- Falta/ inválido → `422 { code: 'CAPTCHA_REQUIRED' }`.

## Motor
`app/Support/TurnstileVerifier::verify($token, $ip)` — secret vacío → true;
con secret sin token → false; POST a `siteverify` (timeout 5s), `success===true`.
Front: `components/ui/Turnstile.tsx` (renderiza sólo si hay site key). Tests:
`tests/Feature/Auth/TurnstileTest.php` (9, incl. no-op sin secret).

## Para ACTIVARLO (requiere llaves del usuario)
1. Crea un widget en Cloudflare Turnstile (gratis) → obtén **Site key** y **Secret key**.
2. `apps/api/.env`: `TURNSTILE_SECRET_KEY=<secret>` → `php artisan config:cache`.
3. `apps/web/.env.production`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site>` → **rebuild** del Next (deploy-web).
Ambas juntas: sin el secret el backend nunca exige captcha; sin la site key el widget no aparece.
