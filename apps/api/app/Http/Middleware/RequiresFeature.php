<?php

namespace App\Http\Middleware;

use App\Support\Features;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea una ruta cuando el plan del tenant no incluye la feature key
 * requerida. Devuelve JSON 402 con `code: FEATURE_LOCKED` y `upgrade_url`
 * para que el frontend redirija al cliente al /admin/billing.
 *
 * Uso:
 *   Route::middleware(['auth:sanctum', 'tenant', 'feature:inventario'])->group(...)
 *
 * Registro: alias 'feature' en `bootstrap/app.php`.
 */
class RequiresFeature
{
    public function handle(Request $req, Closure $next, string $feature): Response
    {
        $local = app(TenantContext::class)->local();

        if (! $local) {
            return response()->json([
                'message' => 'Sin tenant identificado.',
                'code'    => 'NO_TENANT',
            ], 403);
        }

        // Backwards-compat: si el local NO tiene plan asignado todavía (pre-SaaS
        // o seeders existentes), no bloqueamos. Solo se aplica el gating cuando
        // el local entró al SaaS. Cuando todos los locales tengan plan_id,
        // este branch se puede remover.
        if ($local->plan_id === null) {
            return $next($req);
        }

        if (! $local->hasActivePlan()) {
            return response()->json([
                'message'       => 'Tu suscripción no está activa.',
                'code'          => 'PLAN_INACTIVE',
                'current_plan'  => $local->plan?->slug,
                'current_status'=> $local->plan_status,
                'upgrade_url'   => '/admin/billing',
            ], 402);
        }

        if (! Features::has($local, $feature)) {
            return response()->json([
                'message'          => 'Esta función requiere actualizar tu plan.',
                'code'             => 'FEATURE_LOCKED',
                'required_feature' => $feature,
                'current_plan'     => $local->plan?->slug,
                'upgrade_url'      => '/admin/billing',
            ], 402);
        }

        return $next($req);
    }
}
