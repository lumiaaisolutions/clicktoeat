<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Metricas\MetricasService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Métricas", description="KPIs y reportes estadísticos del local.")
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
