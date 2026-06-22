# ADR-010 — Migración del token de Sanctum: localStorage → cookie HttpOnly

**Fecha**: 2026-06-22
**Status**: aceptado (spec) / pendiente implementación
**Severidad audit**: SEV-2 (CVSS 9.0 — la cripto más importante del audit)
**Esfuerzo estimado**: ~1 semana (1 sprint dedicado)
**Stakeholders**: Backend, Frontend, Mobile, DevOps

---

## Contexto

Hoy el frontend Next.js guarda el bearer token Sanctum en `localStorage`
(key `clickeat:token`, ver `apps/web/src/lib/api.ts:5,44-46`). Cualquier
JavaScript ejecutándose en el dominio puede leerlo.

Combinado con:
- Cualquier XSS reflejada/almacenada (panel admin sin CSP estricta blocking)
- `dangerouslySetInnerHTML` en email-templates preview (mitigado en SEV-7
  con iframe sandbox + DOMPurify, pero la base sigue siendo vulnerable)
- Tokens Sanctum que ahora expiran a 7 días pero AÚN siguen sin rotación

→ Una sola XSS en cualquier punto exfiltra sesión de owner/super_admin
por 7 días.

El audit lo flageó como CVSS 9.0 (la más alta del bloque rojo).

---

## Decisión

Migrar el token de Sanctum a una cookie `HttpOnly + Secure + SameSite=Lax`
seteada por el backend en login y removida en logout. El JS del frontend
ya NO puede acceder al token.

Para que `withCredentials: true` de Axios envíe la cookie automáticamente,
el backend debe leer la cookie y traducirla a `Authorization: Bearer ...`
internamente (vía middleware `CookieToBearer`).

---

## Diseño de implementación

### Fase 1 — Backend (Laravel)

**Nuevo middleware `App\Http\Middleware\CookieToBearer`** (no toca Sanctum
config, solo añade el header internamente):

```php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CookieToBearer
{
    public function handle(Request $request, Closure $next)
    {
        // Si ya viene Authorization header explícito (mobile app, API
        // externa via PAT), respetar — la cookie es solo para el web.
        if (! $request->bearerToken() && ($cookie = $request->cookie('cte_token'))) {
            $request->headers->set('Authorization', "Bearer {$cookie}");
        }
        return $next($request);
    }
}
```

Registrar **antes** de `auth:sanctum` en `bootstrap/app.php` o
`Http/Kernel.php`:

```php
$middleware->prepend(\App\Http\Middleware\CookieToBearer::class);
```

**Modificar `AuthController::login()`** para setear la cookie ADEMÁS de
devolver el token en JSON (mobile sigue leyendo el JSON):

```php
return response()->json([
    'user'  => $user->only(['id', 'nombre', 'email', 'rol', 'local_id']),
    'token' => $token,
])->cookie(
    'cte_token',
    $token,
    minutes: 60 * 24 * 7,    // 7 días igual que el TTL del token Sanctum
    path: '/',
    domain: config('session.domain'),  // null por default = host actual
    secure: app()->isProduction(),     // true en prod, false en dev
    httpOnly: true,
    sameSite: 'Lax',                   // 'Strict' rompe el flujo /onboarding-token
);
```

**Modificar `AuthController::logout()`** para limpiar la cookie:

```php
public function logout(Request $request): JsonResponse
{
    $request->user()->currentAccessToken()->delete();
    return response()->json(null, 204)
        ->cookie('cte_token', '', -1, '/');  // expira retroactivamente
}
```

**CORS** (`config/cors.php`): ya tenemos `supports_credentials => true`
y origins explícitos — está OK. No requiere cambios.

### Fase 2 — Frontend (Next.js web)

**`apps/web/src/lib/api.ts`** — quitar `tokenStore` y cambiar a cookies:

```ts
export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,    // ← cambio principal: envía cookies cross-origin
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15_000,
});

// QUITAR el interceptor que pone Authorization desde localStorage
// El backend lee la cookie cte_token y lo añade internamente.

// QUITAR `tokenStore` por completo — ya no se accede al token desde JS.
```

**`apps/web/src/store/auth.ts`** — el store ya no necesita gestionar el
token. Solo el `user` object queda (que no es sensible — solo nombre,
email, rol, id).

**`apps/web/src/lib/api.ts` downloadFile** — ya no necesita pasar el
token manualmente:

```ts
export async function downloadFile(path: string, params?: Record<string, string>) {
  // ...
  const res = await fetch(url, { credentials: 'include' });
  // ...
}
```

### Fase 3 — Mobile (Expo)

**`apps/mobile/src/core/api.ts`** — mobile **NO** usa cookies (no es web
context). Mantiene el patrón actual: lee token de `secure-store`, lo
añade como `Authorization: Bearer`. El backend respeta el header explícito
gracias al `if (! $request->bearerToken())` del middleware
`CookieToBearer`.

Cero cambios en mobile. ✓

### Fase 4 — CSP estricta blocking (defense in depth)

Una vez que el token NO está accesible al JS, podemos endurecer la CSP
de `apps/web/next.config.mjs` de `Content-Security-Policy-Report-Only` a
`Content-Security-Policy` (blocking) con `script-src 'self' 'nonce-{}'`
en vez de `'unsafe-inline'`. Cierra el blast radius de XSS futura.

Requiere:
- Agregar nonce a cada `<script>` inline de Next.js (Next 14 soporta esto
  via `headers()` returns + middleware que inyecta nonce).
- Migrar `style-src 'unsafe-inline'` (tailwind usa inline styles
  parcialmente) — investigar alternativas.

Esto es el TRABAJO REAL de SEV-2 — la cookie es solo el primer paso.

---

## Plan de despliegue (orden importa)

**Día 1**: implementar CookieToBearer + cambios en AuthController. Tests
unitarios. Deploy API a prod. Frontend sigue con localStorage — todo
funciona porque cookie es solo capa adicional, no reemplazo todavía.

**Día 2**: implementar cambios en frontend. Deploy a staging. Verificar:
- Login → cookie seteada (devtools)
- Cookie tiene HttpOnly + Secure + SameSite=Lax flags
- localStorage YA NO tiene `clickeat:token` después de login
- Logout → cookie borrada
- 401 handling sigue funcionando (interceptor de Axios sobre la cookie)

**Día 3**: smoke test en staging. Probar flujo completo (login, navigation,
admin actions, logout, re-login). Validar mobile sigue funcionando.

**Día 4**: deploy a prod. **Ventana de mantenimiento corta** — los
usuarios con sesiones activas tendrán que re-login porque su token
viejo está en localStorage (ya no se lee) pero no en cookie (no se setó).
Una vez re-login, todo funciona transparente.

**Día 5**: monitor en Sentry por errores nuevos. Ajustar lo que aparezca.

**Día 6-7**: implementar CSP blocking (Fase 4). Esta es la capa que
realmente cierra el blast radius de XSS.

---

## Trade-offs

### A favor

- **Elimina vector principal de XSS → ATO**. Sin token en JS, una XSS
  no puede exfiltrar sesión.
- **HttpOnly + Secure + SameSite=Lax** son flags por default seguros.
- **Sin breaking change para mobile** — sigue usando bearer header.
- **Backward compat durante transición**: el middleware acepta tanto
  cookie como bearer. Mobile y API externa siguen funcionando.

### En contra

- **Refactor del frontend grande**: tocar `lib/api.ts`, `store/auth.ts`,
  posibles otros lugares que asumen el token está accesible al JS.
- **Migración de sesiones activas**: todos los users actuales tienen que
  re-login.
- **CSRF**: con cookies viene la responsabilidad de proteger contra CSRF.
  Sanctum + cookie + `SameSite=Lax` ya cubre la mayoría de casos, pero
  endpoints state-changing deben validar `Origin`/`Referer` o usar
  CSRF token explícito.
- **Subdomain considerations**: si en el futuro splitamos admin a
  `admin.lumiaaisolutions.com`, hay que decidir si la cookie es
  subdominio-específica o cross-subdomain (`domain=.lumiaaisolutions.com`).

---

## Alternativas consideradas

1. **Mantener localStorage + CSP estricta**: la CSP previene XSS pero NO
   protege contra otros vectores (extensiones del browser maliciosas,
   logs leak, etc.). Cookies HttpOnly es defensa más profunda.

2. **BFF pattern (Backend For Frontend)**: el Next.js server side recibe
   login, guarda el token server-side en un session store (Redis), y al
   cliente solo manda un session id. Más complejo, requiere infra
   adicional (Redis o similar), pero es lo que hace Auth0/Clerk. Para
   nuestra escala (~3 locales) es over-engineering.

3. **PASETO en lugar de Sanctum**: tokens criptográficos firmados (no
   guardados en DB). Permitiría stateless. Pero requiere refactor de
   Sanctum completo. Out of scope.

---

## Cuándo ejecutar este ADR

**No esta sesión.** Esto es ~1 sprint dedicado (5-7 días incluyendo
testing en staging + deploy). Mejor:

- Próxima ventana de baja actividad
- Con el equipo informado para que monitoreen Sentry tras el deploy
- Con ventana de "todos los usuarios re-login" comunicada

Esta sesión cierra **17/18 hallazgos del audit + plan ejecutable para el 18o**.
El SEV-2 queda con la mejor preparación posible para ejecutar en una sesión
dedicada futura.

---

## Referencias

- Audit del 2026-06-19: [`docs/security/auditoria-integral-2026-06-19.md`](../security/auditoria-integral-2026-06-19.md)
- OWASP A07:2021 — Identification and Authentication Failures
- OWASP ASVS V3.4 — Cookie-based Session Management
- Laravel Sanctum docs: https://laravel.com/docs/11.x/sanctum
- Next.js cookies docs: https://nextjs.org/docs/app/api-reference/functions/cookies
