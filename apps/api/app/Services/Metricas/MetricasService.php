<?php

namespace App\Services\Metricas;

use App\Models\Compra;
use App\Models\DetallePedido;
use App\Models\Pedido;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\DB;

/**
 * Calcula KPIs y series temporales para la pantalla de reportes.
 *
 * Para mantener costos razonables, todo lo agrega en pocas queries:
 *  - Una agregada de pedidos por estado/método.
 *  - Una serie diaria de ventas (group by DATE).
 *  - Un top de productos (join detalle_pedidos).
 *  - Compras del periodo (para margen aproximado).
 *
 * Filtros: por defecto se cuentan pedidos NO cancelados ni eliminados.
 */
class MetricasService
{
    public function calcular(int $localId, Carbon $desde, Carbon $hasta): array
    {
        $rango = [$desde->copy()->startOfDay(), $hasta->copy()->endOfDay()];

        $pedidosBase = Pedido::query()
            ->where('local_id', $localId)
            ->whereBetween('created_at', $rango)
            ->where('estado', '!=', 'cancelado');

        // ── 1. Resumen general ───────────────────────────────
        $resumen = (clone $pedidosBase)
            ->selectRaw('
                COUNT(*) as pedidos,
                COALESCE(SUM(total), 0)        as ventas_total,
                COALESCE(SUM(subtotal), 0)     as ventas_subtotal,
                COALESCE(SUM(delivery_fee), 0) as ingresos_envio,
                COALESCE(AVG(total), 0)        as ticket_promedio
            ')
            ->first();

        // ── 2. Pedidos por estado ────────────────────────────
        $porEstado = (clone $pedidosBase)
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado');

        // ── 3. Pedidos por método de entrega ─────────────────
        $porEntrega = (clone $pedidosBase)
            ->selectRaw('metodo_entrega, COUNT(*) as pedidos, COALESCE(SUM(total), 0) as monto')
            ->groupBy('metodo_entrega')
            ->get()
            ->keyBy('metodo_entrega');

        // ── 4. Pedidos por método de pago ────────────────────
        $porPago = (clone $pedidosBase)
            ->selectRaw('metodo_pago, COUNT(*) as pedidos, COALESCE(SUM(total), 0) as monto')
            ->groupBy('metodo_pago')
            ->get()
            ->keyBy('metodo_pago');

        // ── 5. Serie temporal: ventas por día ────────────────
        $driver  = DB::connection()->getDriverName();
        $dateExpr = $driver === 'sqlite'
            ? "strftime('%Y-%m-%d', created_at)"
            : "DATE(created_at)";

        $ventasDiarias = (clone $pedidosBase)
            ->selectRaw("$dateExpr as fecha, COUNT(*) as pedidos, COALESCE(SUM(total), 0) as ventas")
            ->groupBy('fecha')
            ->orderBy('fecha')
            ->get()
            ->keyBy('fecha');

        // Rellenar días faltantes con 0
        $serie = [];
        foreach (CarbonPeriod::create($desde->copy()->startOfDay(), $hasta->copy()->endOfDay()) as $dia) {
            $key = $dia->toDateString();
            $row = $ventasDiarias->get($key);
            $serie[] = [
                'fecha'   => $key,
                'pedidos' => (int)   ($row->pedidos ?? 0),
                'ventas'  => (float) ($row->ventas  ?? 0),
            ];
        }

        // ── 6. Top productos vendidos ────────────────────────
        $topProductos = DetallePedido::query()
            ->select('producto_nombre')
            ->selectRaw('SUM(cantidad)            as cantidad_total')
            ->selectRaw('SUM(subtotal)            as ingresos')
            ->selectRaw('COUNT(DISTINCT pedido_id) as pedidos')
            ->whereIn('pedido_id', (clone $pedidosBase)->select('id'))
            ->groupBy('producto_nombre')
            ->orderByDesc('cantidad_total')
            ->limit(10)
            ->get();

        // ── 7. Compras del periodo (para margen aprox) ───────
        $compras = Compra::query()
            ->where('local_id', $localId)
            ->whereBetween('fecha', [$desde->toDateString(), $hasta->toDateString()])
            ->where('estado', 'registrada')
            ->selectRaw('COUNT(*) as compras, COALESCE(SUM(total), 0) as costo_compras')
            ->first();

        $costoCompras  = (float) ($compras->costo_compras ?? 0);
        $ventasTotal   = (float) ($resumen->ventas_total ?? 0);
        $margenAprox   = $ventasTotal - $costoCompras;
        $margenPct     = $ventasTotal > 0 ? round(($margenAprox / $ventasTotal) * 100, 1) : 0;

        // ── 8. Estado bajo stock (snapshot actual, no del rango) ──
        $bajoStockCount = DB::table('ingredientes')
            ->where('local_id', $localId)
            ->where('activo', true)
            ->whereColumn('stock', '<=', 'stock_minimo')
            ->count();

        return [
            'rango' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
                'dias'  => (int) $desde->copy()->startOfDay()->diffInDays($hasta->copy()->startOfDay()) + 1,
            ],
            'resumen' => [
                'pedidos'          => (int)   $resumen->pedidos,
                'ventas_total'     => (float) $resumen->ventas_total,
                'ventas_subtotal'  => (float) $resumen->ventas_subtotal,
                'ingresos_envio'   => (float) $resumen->ingresos_envio,
                'ticket_promedio'  => (float) $resumen->ticket_promedio,
                'costo_compras'    => $costoCompras,
                'margen_aprox'     => $margenAprox,
                'margen_pct'       => $margenPct,
                'bajo_stock'       => $bajoStockCount,
            ],
            'por_estado'  => $porEstado,
            'por_entrega' => $porEntrega->map(fn ($r) => [
                'pedidos' => (int) $r->pedidos,
                'monto'   => (float) $r->monto,
            ]),
            'por_pago'    => $porPago->map(fn ($r) => [
                'pedidos' => (int) $r->pedidos,
                'monto'   => (float) $r->monto,
            ]),
            'serie_diaria' => $serie,
            'top_productos' => $topProductos->map(fn ($r) => [
                'producto_nombre' => $r->producto_nombre,
                'cantidad'        => (float) $r->cantidad_total,
                'ingresos'        => (float) $r->ingresos,
                'pedidos'         => (int)   $r->pedidos,
            ]),
        ];
    }
}
