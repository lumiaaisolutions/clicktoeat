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
            'low_productos' => $this->productosMenosVendidos($localId, $desde, $hasta),
            'heatmap'       => $this->heatmapDiaHora($localId, $desde, $hasta),
            'por_dia_semana'=> $this->porDiaSemana($localId, $desde, $hasta),
        ];
    }

    /**
     * Productos activos que se vendieron MENOS (o nada) en el rango.
     * Útil para decidir qué quitar del menú.
     */
    protected function productosMenosVendidos(int $localId, Carbon $desde, Carbon $hasta): array
    {
        $rows = DB::select(<<<'SQL'
            SELECT p.id, p.nombre,
                   COALESCE(SUM(d.cantidad), 0) AS cantidad,
                   COALESCE(SUM(d.subtotal), 0) AS ingresos
            FROM productos p
            LEFT JOIN detalle_pedidos d ON d.producto_id = p.id
            LEFT JOIN pedidos pe ON pe.id = d.pedido_id
                AND pe.created_at BETWEEN ? AND ?
                AND pe.estado != 'cancelado'
            WHERE p.local_id = ? AND p.disponible = 1
            GROUP BY p.id, p.nombre
            ORDER BY cantidad ASC, p.nombre ASC
            LIMIT 8
        SQL, [$desde->copy()->startOfDay(), $hasta->copy()->endOfDay(), $localId]);

        return array_map(fn ($r) => [
            'producto_nombre' => $r->nombre,
            'cantidad'        => (float) $r->cantidad,
            'ingresos'        => (float) $r->ingresos,
        ], $rows);
    }

    /**
     * Matriz 7 días × 24 horas con el conteo de pedidos. Permite ver
     * en qué horarios tu local recibe más volumen.
     *   Index 0 = domingo, 6 = sábado. Horas 0-23.
     */
    protected function heatmapDiaHora(int $localId, Carbon $desde, Carbon $hasta): array
    {
        $driver = DB::connection()->getDriverName();
        $dowExpr  = $driver === 'sqlite' ? "CAST(strftime('%w', created_at) AS INTEGER)"   : 'DAYOFWEEK(created_at) - 1';
        $hourExpr = $driver === 'sqlite' ? "CAST(strftime('%H', created_at) AS INTEGER)"  : 'HOUR(created_at)';

        $rows = DB::table('pedidos')
            ->where('local_id', $localId)
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('created_at', [$desde->copy()->startOfDay(), $hasta->copy()->endOfDay()])
            ->selectRaw("$dowExpr as dow, $hourExpr as hour, COUNT(*) as count, COALESCE(SUM(total),0) as monto")
            ->groupBy('dow', 'hour')
            ->get();

        // 7×24 matriz inicializada en 0
        $matrix = array_fill(0, 7, array_fill(0, 24, ['count' => 0, 'monto' => 0.0]));
        foreach ($rows as $r) {
            $matrix[(int) $r->dow][(int) $r->hour] = [
                'count' => (int) $r->count,
                'monto' => (float) $r->monto,
            ];
        }
        return $matrix;
    }

    /** Pedidos y ventas agrupados por día de la semana (lun-dom). */
    protected function porDiaSemana(int $localId, Carbon $desde, Carbon $hasta): array
    {
        $driver = DB::connection()->getDriverName();
        $dowExpr = $driver === 'sqlite' ? "CAST(strftime('%w', created_at) AS INTEGER)" : 'DAYOFWEEK(created_at) - 1';

        $rows = DB::table('pedidos')
            ->where('local_id', $localId)
            ->where('estado', '!=', 'cancelado')
            ->whereBetween('created_at', [$desde->copy()->startOfDay(), $hasta->copy()->endOfDay()])
            ->selectRaw("$dowExpr as dow, COUNT(*) as count, COALESCE(SUM(total),0) as monto")
            ->groupBy('dow')
            ->orderBy('dow')
            ->get();

        $out = array_fill(0, 7, ['count' => 0, 'monto' => 0.0]);
        foreach ($rows as $r) {
            $out[(int) $r->dow] = ['count' => (int) $r->count, 'monto' => (float) $r->monto];
        }
        return $out;
    }
}
