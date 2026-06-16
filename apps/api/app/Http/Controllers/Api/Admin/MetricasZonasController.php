<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Local;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * F97 — Métricas por zona. MVP sin geocoding inverso: usa el texto de
 * `direccion` para tratar de extraer ciudad / estado (heurística simple),
 * y devuelve lista de locales + sus ventas del mes con lat/lng para
 * que el frontend pinte un mapa.
 */
class MetricasZonasController extends Controller
{
    public function index(): JsonResponse
    {
        $inicioMes = now()->startOfMonth();

        $locales = Local::query()
            ->withoutGlobalScopes()
            ->where('activo', true)
            ->select('id', 'nombre', 'slug', 'direccion', 'lat', 'lng', 'logo_url', 'color_primario')
            ->get();

        // Ventas del mes por local
        $ventasMes = DB::table('pedidos')
            ->select('local_id', DB::raw('COUNT(*) as pedidos'), DB::raw('COALESCE(SUM(total),0) as ventas'))
            ->where('created_at', '>=', $inicioMes)
            ->where('estado', '!=', 'cancelado')
            ->groupBy('local_id')
            ->get()
            ->keyBy('local_id');

        $maxVentas = (float) ($ventasMes->max('ventas') ?? 0);

        $rows = $locales->map(function ($l) use ($ventasMes, $maxVentas) {
            $v = $ventasMes->get($l->id);
            $ventas = (float) ($v->ventas ?? 0);
            $pedidos = (int) ($v->pedidos ?? 0);

            // Verde / amarillo / rojo según % del top
            $intensity = $maxVentas > 0 ? $ventas / $maxVentas : 0;
            $tone = $intensity > 0.6 ? 'verde' : ($intensity > 0.2 ? 'amarillo' : 'rojo');

            return [
                'id'             => $l->id,
                'nombre'         => $l->nombre,
                'slug'           => $l->slug,
                'direccion'      => $l->direccion,
                'lat'            => $l->lat !== null ? (float) $l->lat : null,
                'lng'            => $l->lng !== null ? (float) $l->lng : null,
                'logo_url'       => $l->logo_url,
                'color_primario' => $l->color_primario,
                'ventas_mes'     => $ventas,
                'pedidos_mes'    => $pedidos,
                'tone'           => $tone,
            ];
        })->values();

        return response()->json([
            'data' => $rows,
            'max_ventas' => $maxVentas,
            'desde' => $inicioMes->toIso8601String(),
        ]);
    }
}
