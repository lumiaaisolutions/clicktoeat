<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolves the active tenant (local_id) from the authenticated user and
 * binds it into TenantContext so global scopes filter all queries.
 *
 * Super admins bypass the scope.
 */
class EnforceTenantScope
{
    public function __construct(protected TenantContext $tenants) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        // super_admin: sin scope (puede ver todos los locales)
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if (! $user->local_id) {
            return response()->json([
                'message' => 'Tu usuario no está vinculado a un local. Contacta al administrador.',
            ], 403);
        }

        $this->tenants->set($user->local_id);

        return $next($request);
    }
}
