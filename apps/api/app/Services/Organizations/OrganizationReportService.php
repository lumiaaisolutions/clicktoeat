<?php

namespace App\Services\Organizations;

use App\Models\Local;
use App\Models\Organization;
use App\Models\Pedido;
use App\Models\Producto;

/**
 * Único punto del sistema que cruza datos de varios `Local`. Ver ADR-014:
 * NUNCA usar `withoutGlobalScopes()` a secas — siempre `withoutTenantScope()`
 * + `whereIn('local_id', $idsVerificados)` con IDs resueltos explícitamente
 * de `organization_id`, igual que el patrón ya usado en OrderService.
 */
class OrganizationReportService
{
    public function resumen(Organization $organization): array
    {
        $localIds = Local::query()
            ->where('organization_id', $organization->id)
            ->pluck('id');

        $porLocal = Local::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'nombre', 'slug'])
            ->map(function (Local $local) {
                $ventas30d = Pedido::query()->withoutTenantScope()
                    ->where('local_id', $local->id)
                    ->where('estado', '!=', 'cancelado')
                    ->where('created_at', '>=', now()->subDays(30))
                    ->sum('total');

                $productosActivos = Producto::query()->withoutTenantScope()
                    ->where('local_id', $local->id)
                    ->where('disponible', true)
                    ->count();

                return [
                    'localId' => $local->id,
                    'nombre' => $local->nombre,
                    'slug' => $local->slug,
                    'ventas30d' => round((float) $ventas30d, 2),
                    'productosActivos' => $productosActivos,
                ];
            })
            ->values()
            ->all();

        return [
            'organizationId' => $organization->id,
            'nombre' => $organization->nombre,
            'totalLocales' => $localIds->count(),
            'ventasTotales30d' => round(array_sum(array_column($porLocal, 'ventas30d')), 2),
            'porLocal' => $porLocal,
        ];
    }
}
