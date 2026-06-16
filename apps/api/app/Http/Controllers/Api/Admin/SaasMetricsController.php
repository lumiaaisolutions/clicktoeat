<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Plan;
use App\Models\SubscriptionEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard interno para super_admin: MRR, ARR, churn, distribución por
 * plan, conversión trial→paid, último cambio de estado relevante.
 *
 * Todas las queries son agregadas, no devuelven PII.
 */
class SaasMetricsController extends Controller
{
    public function index(): JsonResponse
    {
        $planMap = Plan::pluck('precio_mxn_centavos', 'id'); // [plan_id => centavos]

        // MRR = sum(precio) de locales 'active' + 'trialing'.
        $activos = Local::query()
            ->withoutGlobalScopes()
            ->whereIn('plan_status', ['active', 'trialing'])
            ->whereNotNull('plan_id')
            ->get(['plan_id', 'plan_status']);

        $mrrCentavos = 0;
        $trialing = 0;
        $active = 0;
        foreach ($activos as $l) {
            $mrrCentavos += (int) ($planMap[$l->plan_id] ?? 0);
            if ($l->plan_status === 'trialing') $trialing++;
            else $active++;
        }

        // Distribución por plan
        $distribucion = Local::query()
            ->withoutGlobalScopes()
            ->select('plan_id', 'plan_status', DB::raw('count(*) as total'))
            ->whereNotNull('plan_id')
            ->groupBy('plan_id', 'plan_status')
            ->get()
            ->map(function ($row) {
                $plan = Plan::find($row->plan_id);
                return [
                    'plan_slug'   => $plan?->slug ?? '—',
                    'plan_nombre' => $plan?->nombre ?? '—',
                    'status'      => $row->plan_status,
                    'count'       => (int) $row->total,
                ];
            });

        // Churn últimos 30d = locales cancelados / activos al inicio
        $canceladosUlt30 = Local::query()
            ->withoutGlobalScopes()
            ->where('plan_status', 'canceled')
            ->where('canceled_at', '>=', now()->subDays(30))
            ->count();
        $activosInicio = $active + $canceladosUlt30; // proxy razonable
        $churn = $activosInicio > 0 ? round($canceladosUlt30 / $activosInicio * 100, 2) : 0.0;

        // Trial→Paid conversion (últimos 30 días)
        $trialesUlt30 = SubscriptionEvent::query()
            ->where('type', 'checkout.session.completed')
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        $pagosUlt30 = SubscriptionEvent::query()
            ->where('type', 'invoice.paid')
            ->where('created_at', '>=', now()->subDays(30))
            ->count();
        $conv = $trialesUlt30 > 0 ? round($pagosUlt30 / $trialesUlt30 * 100, 2) : 0.0;

        // Últimos eventos (sin payload, solo metadatos)
        $eventos = SubscriptionEvent::query()
            ->latest()
            ->limit(10)
            ->get(['id', 'local_id', 'type', 'processed_at', 'created_at']);

        return response()->json([
            'mrr_mxn'        => round($mrrCentavos / 100, 2),
            'arr_mxn'        => round($mrrCentavos / 100 * 12, 2),
            'trialing_count' => $trialing,
            'active_count'   => $active,
            'churn_30d_pct'  => $churn,
            'conversion_30d_pct' => $conv,
            'distribucion'   => $distribucion,
            'eventos_recientes' => $eventos,
            'cohorts'        => $this->cohorts(),
            'generated_at'   => now()->toIso8601String(),
        ]);
    }

    /**
     * Cohort de retención mensual: agrupa locales por mes de alta y, para
     * cada cohort, calcula qué % seguía con plan activo en M+1, M+2, ..., M+5.
     *
     * Devuelve hasta los últimos 6 meses de alta para que la tabla quepa.
     * El "mes 0" siempre es 100% por definición.
     */
    private function cohorts(): array
    {
        $monthsBack = 6;
        $now = now()->startOfMonth();

        // 1. Por cada mes de alta, total de locales que se dieron de alta
        $cohorts = [];
        for ($i = $monthsBack - 1; $i >= 0; $i--) {
            $monthStart = $now->copy()->subMonths($i);
            $monthEnd   = $monthStart->copy()->endOfMonth();

            $altas = Local::query()
                ->withoutGlobalScopes()
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->get(['id', 'plan_status', 'pago_externo', 'canceled_at']);

            $cohortSize = $altas->count();
            $row = [
                'cohort'       => $monthStart->format('Y-m'),
                'cohort_label' => $monthStart->locale('es_MX')->isoFormat('MMM YYYY'),
                'size'         => $cohortSize,
                'retencion'    => [],
            ];

            // 2. Para cada mes posterior, qué % seguía activo
            for ($m = 0; $m <= $i; $m++) {
                $cutoff = $monthStart->copy()->addMonths($m)->endOfMonth();
                if ($cutoff->isAfter($now->copy()->endOfMonth())) break;

                $sigueActivo = $altas->filter(function ($l) use ($cutoff) {
                    if ($l->pago_externo) return true;
                    if ($l->canceled_at && $l->canceled_at->lte($cutoff)) return false;
                    return in_array($l->plan_status, ['active', 'trialing'], true);
                })->count();

                $row['retencion'][] = [
                    'mes' => $m,
                    'pct' => $cohortSize > 0 ? round($sigueActivo / $cohortSize * 100, 1) : 0.0,
                    'count' => $sigueActivo,
                ];
            }

            $cohorts[] = $row;
        }

        return $cohorts;
    }
}
