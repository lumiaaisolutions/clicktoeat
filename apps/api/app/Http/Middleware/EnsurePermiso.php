<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fase F del roadmap de salón (docs/features/salon-roadmap.md): permiso de
 * módulo centralizado. Antes cada controller de zona validaba el permiso a
 * mano; este middleware lo hace en la ruta. El dueño (owner/super_admin) pasa
 * siempre; el staff sólo si su `permisos` incluye el módulo.
 *
 * Uso:  Route::middleware('permiso:cocina')->group(...)
 * Registro: alias 'permiso' en bootstrap/app.php.
 */
class EnsurePermiso
{
    public function handle(Request $req, Closure $next, string $modulo): Response
    {
        $user = $req->user();

        if (! $user) {
            return response()->json(['message' => 'No autenticado.'], 401);
        }

        if ($user->isSuperAdmin() || $user->isOwner() || $user->puedeAcceder($modulo)) {
            return $next($req);
        }

        return response()->json([
            'message' => 'No tienes permiso para esta sección.',
            'code' => 'PERMISO_DENEGADO',
            'required_permiso' => $modulo,
        ], 403);
    }
}
