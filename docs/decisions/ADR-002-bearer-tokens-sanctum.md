# ADR-002: Sanctum bearer tokens (no SPA-stateful)

> **Status:** aceptada
> **Fecha:** 2026-06-10 (decisión histórica)
> **Decisores:** equipo inicial

## Contexto

Laravel Sanctum tiene dos modos de operación:

1. **SPA-stateful**: el frontend vive en el mismo dominio que la API, usa cookies + CSRF token (`/sanctum/csrf-cookie`), Laravel autentica via guard `web` con sesión.
2. **Bearer tokens**: el cliente recibe un token Sanctum (en `personal_access_tokens`), lo guarda y lo envía en `Authorization: Bearer <token>` por cada request.

El frontend de ClickToEat es Next.js corriendo en otro origen (en dev: `localhost:3000` vs API en `localhost:8080`). En SPA-stateful esto fuerza:
- Cookies cross-origin con `SameSite=None; Secure` (obliga HTTPS local).
- CSRF preflight a cada mutación.
- `SANCTUM_STATEFUL_DOMAINS` mantenido y sincronizado.
- Configurar `withCredentials` en axios + CORS con `supports_credentials: true`.

## Decisión

Usamos **bearer tokens**. El frontend obtiene el token vía `POST /auth/login`, lo guarda en `localStorage` (clave `clickeat:token`), y lo envía en cada request via interceptor de axios. `SANCTUM_STATEFUL_DOMAINS` se deja vacío explícitamente.

`apps/api/bootstrap/app.php` lo documenta:

```
// API token-only (Sanctum personal access tokens).
// NO usamos el modo "SPA stateful" porque Next.js corre en otro origen
// (localhost:3000) y eso forzaría CSRF + cookies. Bearer token puro.
```

## Alternativas consideradas

- **SPA-stateful** — más "Laravel-idiomatic" cuando frontend y API comparten dominio. Descartada por la complejidad cross-origin descrita arriba.
- **JWT custom** (firebase/php-jwt, tymon/jwt-auth) — descartada. Sanctum + tabla `personal_access_tokens` ya cubre el caso, con la ventaja de poder **revocar tokens individuales** y poder asignarles **abilities** por token (útil para integraciones futuras).

## Consecuencias

### Positivas

- Sin CSRF dance. Sin cookie cross-origin.
- Token visible en localStorage → fácil debug, fácil reset (logout limpia localmente).
- Permite multi-device / multi-sesión sin lógica extra (cada login es un token nuevo).
- Permite revocar tokens individuales (`$user->tokens()->delete()` o por ID).
- Permite **abilities** por token (preparado para API keys de scope reducido).

### Negativas

- `localStorage` es vulnerable a XSS — un script malicioso embebido puede leer el token. Mitigación: política estricta de no usar `dangerouslySetInnerHTML` con contenido del backend; headers de seguridad en nginx.
- Sin auto-logout por inactividad sin lógica extra (cookies serverside tienen TTL, los bearer tokens hoy no expiran — `expires_at` queda NULL).
- Tokens sobreviven al cierre del navegador (los del session-cookie modo expiran).

### Neutras

- Para mobile (futuro), los bearer tokens son trivialmente reutilizables. Si hubiéramos elegido stateful, mobile habría requerido otra cosa.

## Cuándo reabrir esta decisión

- Cuando el frontend y la API compartan dominio (subdominios del mismo eTLD+1) — entonces SPA-stateful empieza a ser razonable.
- Cuando se introduzcan datos extremadamente sensibles (pagos, datos de salud) y el riesgo de XSS-token-theft justifique migrar a cookies `HttpOnly`.

## Pendientes relacionados

- Establecer **`expires_at`** por defecto en tokens (rotación periódica).
- Considerar mover el token a una cookie `HttpOnly` emitida por el endpoint de login (mejor que localStorage frente a XSS), manteniendo el resto del flujo bearer.

Ver [`docs/architecture/auth-roles.md`](../architecture/auth-roles.md).
