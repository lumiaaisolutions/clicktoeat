<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate server-side de "plan activo" para el grupo tenant autenticado.
 *
 * Cierra el hueco donde un local con la suscripción vencida
 * (`plan_status` incomplete/past_due/canceled o trial vencido) podía seguir
 * creando/editando datos pegándole a la API directo, porque el único freno
 * era la pantalla del frontend (`PlanInactiveScreen`). Ver
 * docs/features/feature-gating.md y el postmortem del bypass.
 *
 * Política:
 * - **Lecturas (GET/HEAD/OPTIONS) siempre pasan**: el dueño debe poder ver sus
 *   datos y su estado aunque no pague.
 * - **Escrituras se bloquean con 402 PLAN_INACTIVE** si el plan no está activo…
 * - …salvo un allowlist de rutas necesarias para *reactivar* o pedir ayuda:
 *   billing (feedback de cancelación), ajustes del local, `me/*`, soporte.
 *   El checkout de pago vive fuera del grupo tenant, así que nunca se toca.
 * - **super_admin** siempre pasa (opera fuera del ciclo de billing).
 * - **Sin `plan_id`** (locales pre-SaaS / seeders) pasa — mismo criterio de
 *   backwards-compat que `RequiresFeature`.
 */
class EnsureActivePlan
{
    /** Rutas de escritura que deben seguir accesibles con el plan vencido. */
    private const ALLOWLIST = [
        '*/billing/*',   // billing/cancel-feedback (el checkout está fuera del grupo)
        '*/local',       // PATCH ajustes del local
        '*/me/*',        // switch-local, notif-filtro, etc.
        '*/soporte/*',   // abrir/responder tickets de soporte
    ];

    public function handle(Request $req, Closure $next): Response
    {
        // Lecturas nunca se bloquean.
        if ($req->isMethodSafe()) {
            return $next($req);
        }

        $user = $req->user();
        if ($user && $user->rol === 'super_admin') {
            return $next($req);
        }

        $local = app(TenantContext::class)->local();

        // Sin tenant o sin plan asignado todavía → no gateamos (backwards-compat).
        if (! $local || $local->plan_id === null) {
            return $next($req);
        }

        if ($local->hasActivePlan()) {
            return $next($req);
        }

        foreach (self::ALLOWLIST as $pattern) {
            if ($req->is($pattern)) {
                return $next($req);
            }
        }

        return response()->json([
            'message' => 'Tu suscripción no está activa. Reactiva tu plan para seguir operando.',
            'code' => 'PLAN_INACTIVE',
            'current_plan' => $local->plan?->slug,
            'current_status' => $local->plan_status,
            'upgrade_url' => '/admin/billing',
        ], 402);
    }
}
