<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Gasto;
use App\Models\Pedido;
use App\Services\Metricas\MetricasService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Métricas", description="KPIs y reportes estadísticos del local.")
 *
 * SEV-12 nota: Usa `abort_unless($user && $user->local_id)` inline + feature
 * gate `metricas_avanzadas` en la ruta. Decisión consciente — no es CRUD,
 * no necesita Policy reusable. Confirmado en audit follow-up 2026-06-22.
 */
class MetricasController extends Controller
{
    public function __construct(protected MetricasService $service) {}

    /**
     * @OA\Get(
     *     path="/metricas",
     *     tags={"Métricas"},
     *     security={{"sanctum":{}}},
     *     summary="KPIs + serie temporal + top productos del rango (default: últimos 30 días).",
     *     @OA\Parameter(name="desde", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="preset", in="query", description="hoy|ayer|7d|30d|mes", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->local_id, 403, 'Sin local asignado');

        [$desde, $hasta] = $this->parseRango($request);

        $data = $this->service->calcular($user->local_id, $desde, $hasta);

        return response()->json(['data' => $data]);
    }

    /**
     * Utilidad bruta por mes: ventas (pedidos no cancelados) − gastos OPEX.
     *
     * NOTA: no descuenta costo de insumos (compras) porque la mayoría de
     * los locales no captura compras consistentemente. Sumar OPEX ya da
     * un proxy de utilidad neta para owner sin formación contable.
     */
    public function utilidad(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user && $user->local_id, 403, 'Sin local asignado');

        $meses = max(1, min((int) $request->input('meses', 6), 24));

        $end   = now()->endOfMonth();
        $start = now()->subMonths($meses - 1)->startOfMonth();

        // sqlite (tests) y mysql (prod) tienen sintaxis distintas para extraer YYYY-MM.
        $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
        $mesExpr = fn (string $col) => $driver === 'mysql'
            ? "DATE_FORMAT($col, '%Y-%m')"
            : "strftime('%Y-%m', $col)";

        // Pedidos.total = decimal(10,2) en MXN — sumamos directo.
        $ventasRaw = Pedido::query()
            ->where('local_id', $user->local_id)
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw($mesExpr('created_at').' as mes, SUM(total) as total')
            ->groupBy('mes')->pluck('total', 'mes')->toArray();

        // Gastos.monto_centavos = int → dividir entre 100 al final.
        $gastosRaw = Gasto::query()
            ->whereBetween('fecha', [$start->toDateString(), $end->toDateString()])
            ->selectRaw($mesExpr('fecha').' as mes, SUM(monto_centavos) as total')
            ->groupBy('mes')->pluck('total', 'mes')->toArray();

        $serie = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key     = $cursor->format('Y-m');
            $ventas  = (float) ($ventasRaw[$key] ?? 0);
            $gastos  = (int) ($gastosRaw[$key] ?? 0) / 100;
            $util    = $ventas - $gastos;
            $serie[] = [
                'mes'              => $key,
                'label'            => $cursor->locale('es')->isoFormat('MMM YY'),
                'ventas_mxn'       => round($ventas, 2),
                'gastos_mxn'       => round($gastos, 2),
                'utilidad_mxn'     => round($util, 2),
                'margen_pct'       => $ventas > 0 ? round(($util / $ventas) * 100, 1) : null,
            ];
            $cursor->addMonth();
        }

        $totVentas   = array_sum(array_column($serie, 'ventas_mxn'));
        $totGastos   = array_sum(array_column($serie, 'gastos_mxn'));
        $totUtilidad = $totVentas - $totGastos;

        return response()->json([
            'data' => [
                'meses'           => $meses,
                'serie'           => $serie,
                'total_ventas'    => round($totVentas, 2),
                'total_gastos'    => round($totGastos, 2),
                'total_utilidad'  => round($totUtilidad, 2),
                'margen_promedio' => $totVentas > 0 ? round(($totUtilidad / $totVentas) * 100, 1) : null,
            ],
        ]);
    }

    /** @return array{0: Carbon, 1: Carbon} */
    protected function parseRango(Request $request): array
    {
        $preset = $request->input('preset');
        $now    = Carbon::now();

        if ($preset) {
            return match ($preset) {
                'hoy'   => [$now->copy()->startOfDay(),  $now->copy()->endOfDay()],
                'ayer'  => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
                '7d'    => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
                '30d'   => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
                'mes'   => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
                default => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
            };
        }

        $desde = $request->filled('desde')
            ? Carbon::parse($request->string('desde')->toString())->startOfDay()
            : $now->copy()->subDays(29)->startOfDay();
        $hasta = $request->filled('hasta')
            ? Carbon::parse($request->string('hasta')->toString())->endOfDay()
            : $now->copy()->endOfDay();

        if ($hasta->lt($desde)) {
            [$desde, $hasta] = [$hasta->copy()->startOfDay(), $desde->copy()->endOfDay()];
        }

        return [$desde, $hasta];
    }
}
