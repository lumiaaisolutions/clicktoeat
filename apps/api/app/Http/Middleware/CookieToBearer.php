<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SEV-2 — primer paso de la migración a cookie HttpOnly.
 *
 * Lee la cookie `cte_token` (si existe) y la convierte en header
 * `Authorization: Bearer <token>` ANTES de que `auth:sanctum` revise
 * el header. De esta forma:
 *
 *  - El bearer header explícito SIEMPRE tiene prioridad (mobile, API
 *    externa, scripts que usan PAT siguen funcionando intactos).
 *  - El frontend web que envíe la cookie automáticamente vía
 *    `withCredentials: true` queda autenticado sin tocar el token desde JS.
 *
 * Este middleware es ADITIVO — no rompe nada del flujo existente. La
 * migración full (frontend que pase de localStorage a cookies) se hace
 * en sesión dedicada con ADR-010. Por ahora ambos caminos funcionan
 * simultáneamente para permitir el switch sin big-bang deploy.
 */
class CookieToBearer
{
    public function handle(Request $request, Closure $next): Response
    {
        // Si ya viene el header explícito (mobile, API), no tocamos nada.
        if ($request->bearerToken()) {
            return $next($request);
        }

        // Si llega la cookie cte_token, la convertimos en Bearer header
        // internamente. Sanctum/auth:sanctum la verá igual que un header
        // legítimo del cliente.
        $token = $request->cookie('cte_token');
        if (is_string($token) && $token !== '') {
            $request->headers->set('Authorization', 'Bearer '.$token);
        }

        return $next($request);
    }
}
