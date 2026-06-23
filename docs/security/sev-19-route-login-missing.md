# SEV-19 — `Route [login] not defined` → 500 en endpoints guarded

> **Detectado**: 2026-06-22 durante el smoke test post-deploy del módulo Gastos.
> **Severidad**: Baja (no expone datos, pero rompe contrato de errores HTTP).
> **Estado**: ✅ **CERRADO 2026-06-22 (Fase 1)**.

## Resumen

Cualquier endpoint API guarded (auth:sanctum) devolvía **HTTP 500** cuando
el cliente no enviaba `Accept: application/json` en la request,
en lugar del 401 esperado.

Síntoma:

```bash
# Sin Accept JSON → 500
$ curl -i https://clicktoeat-api.lumiaaisolutions.com/api/v1/pedidos
HTTP/2 500

# Con Accept JSON → 401 (correcto)
$ curl -i -H "Accept: application/json" https://clicktoeat-api.lumiaaisolutions.com/api/v1/pedidos
HTTP/2 401
```

## Causa raíz

En Laravel 11 el middleware `Illuminate\Auth\Middleware\Authenticate`
intenta resolver `route('login')` cuando la request **no** es JSON,
para construir el redirect URL del exception. La aplicación nunca
declaró una ruta llamada `login` (la API no tiene UI de login — el
frontend Next.js corre en otro origen), así que se lanzaba
`RouteNotFoundException` ANTES de que el handler de
`AuthenticationException` pudiera convertirlo a 401 JSON.

Stack típico:

```
Symfony\Component\Routing\Exception\RouteNotFoundException: Route [login] not defined.
  #0 Illuminate\Routing\UrlGenerator->route()
  #1 ApplicationBuilder.php(278): route()           // default callback
  #3 Authenticate.php(118): call_user_func()         // redirectTo()
  #4 Authenticate.php(105): redirectTo()
  #5 Authenticate.php(88): unauthenticated()
```

## Impacto

- ❌ Bajo nivel: rompía monitoring básico (cualquier herramienta que
  haga curl plano a un endpoint guarded leía "API down" cuando en
  realidad sólo no estaba autenticado).
- ❌ Sentry recibía un error 500 por cada hit anónimo a la API, contaminando
  las métricas de errores reales.
- ✅ Sin riesgo de datos: nunca se llegó al controller, sin filtrado.
- ✅ axios (frontend) **sí** manda `Accept: application/json` por default
  en este proyecto, por eso el usuario final nunca lo vio.

## Fix aplicado

Stub de la ruta `login` en `routes/web.php` (no en api porque
`api.php` lleva prefijo `/api/v1`, mientras que `route('login')` busca
una ruta sin prefijo):

```php
// routes/web.php
Route::any('/login', function () {
    return response()->json(['message' => 'No autenticado'], 401);
})->name('login');
```

Decisión: stub vs configurar `redirectGuestsTo(fn () => null)`.
Optado por el stub porque:
- Es explícito: cualquier dev que lea `routes/web.php` ve por qué existe.
- Funciona también si en el futuro alguien usa `redirect()->route('login')` desde otro lugar.
- Independiente de cambios internos de Laravel.

## Tests

`tests/Feature/Auth/UnauthenticatedResponseTest.php` (4 tests):

- ✅ `api_guarded_devuelve_401_con_accept_json`
- ✅ `api_guarded_devuelve_401_sin_accept_json` (regresión directa)
- ✅ `ruta_login_named_responde_401_json`
- ✅ `gastos_guarded_devuelve_401_sin_accept_json` (caso original reportado)

## Verificación en prod

```bash
$ curl -s -o /dev/null -w "%{http_code}\n" https://clicktoeat-api.lumiaaisolutions.com/api/v1/gastos
401
$ curl -s -o /dev/null -w "%{http_code}\n" https://clicktoeat-api.lumiaaisolutions.com/login
401
```

## Referencias

- Commit: `a809f0c` (parte de "feat(gastos+brand): 6 fases").
- Doc producto: [`docs/features/gastos-operativos.md`](../features/gastos-operativos.md).
- Doc audit original: [`docs/security/auditoria-integral-2026-06-19.md`](auditoria-integral-2026-06-19.md).
