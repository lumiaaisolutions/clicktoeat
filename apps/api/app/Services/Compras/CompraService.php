<?php

namespace App\Services\Compras;

use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Registra y revierte compras de mercancía.
 *
 * Al registrar una compra:
 *  1. Crea la fila `compras` + sus `detalle_compras`.
 *  2. Por cada ingrediente:
 *     - aumenta stock
 *     - actualiza costo_unitario con PROMEDIO PONDERADO
 *     - inserta MovimientoInventario tipo 'entrada' con referencia "compra:N"
 *
 * Al anular:
 *  - Valida que stock actual ≥ cantidad comprada (si no, 409 — ya se vendió parte).
 *  - Descuenta stock al valor previo a la compra.
 *  - NO restaura costo_unitario al previo (matemáticamente complicado tras promedio
 *    ponderado; lo dejamos al promedio actual + sugiere ajuste manual si lo necesita).
 *  - Marca la compra como `anulada` (no se borra para auditoría).
 *  - Inserta movimientos de tipo 'salida' con referencia "compra:N:anulacion".
 */
class CompraService
{
    /**
     * @param array{
     *   proveedor?: ?string,
     *   referencia_factura?: ?string,
     *   fecha?: ?string,
     *   notas?: ?string,
     *   impuestos?: ?float,
     *   items: array<int, array{ingrediente_id:int, cantidad:float, costo_unitario:float}>,
     * } $input
     */
    public function registrar(Local $local, array $input, ?int $userId = null): Compra
    {
        if (empty($input['items'])) {
            throw new RuntimeException('La compra debe tener al menos un ingrediente.');
        }

        return DB::transaction(function () use ($local, $input, $userId) {
            // Validar que todos los ingredientes pertenezcan al local
            $ingredienteIds = array_unique(array_column($input['items'], 'ingrediente_id'));
            $ingredientes = Ingrediente::query()
                ->whereIn('id', $ingredienteIds)
                ->where('local_id', $local->id)
                ->when(DB::connection()->getDriverName() === 'mysql', fn ($q) => $q->lockForUpdate())
                ->get()
                ->keyBy('id');

            if ($ingredientes->count() !== count($ingredienteIds)) {
                throw new RuntimeException('Uno o más ingredientes no pertenecen a este local.');
            }

            // Calcular subtotal de la compra
            $subtotal = 0;
            foreach ($input['items'] as $item) {
                $subtotal += (float) $item['cantidad'] * (float) $item['costo_unitario'];
            }
            $impuestos = (float) ($input['impuestos'] ?? 0);
            $total     = $subtotal + $impuestos;

            $compra = Compra::create([
                'local_id'           => $local->id,
                'proveedor'          => $input['proveedor']           ?? null,
                'referencia_factura' => $input['referencia_factura']  ?? null,
                'fecha'              => $input['fecha']                ?? now()->toDateString(),
                'subtotal'           => $subtotal,
                'impuestos'          => $impuestos,
                'total'              => $total,
                'notas'              => $input['notas']                ?? null,
                'estado'             => 'registrada',
                'user_id'            => $userId,
            ]);

            foreach ($input['items'] as $item) {
                /** @var Ingrediente $ing */
                $ing = $ingredientes->get((int) $item['ingrediente_id']);
                $cantidad = (float) $item['cantidad'];
                $costoUnit = (float) $item['costo_unitario'];
                $subtotalLinea = $cantidad * $costoUnit;

                DetalleCompra::create([
                    'compra_id'      => $compra->id,
                    'ingrediente_id' => $ing->id,
                    'cantidad'       => $cantidad,
                    'costo_unitario' => $costoUnit,
                    'subtotal'       => $subtotalLinea,
                ]);

                $stockAntes  = (float) $ing->stock;
                $costoAntes  = (float) $ing->costo_unitario;

                $nuevoStock  = $stockAntes + $cantidad;
                $nuevoCosto  = $this->promedioPonderado(
                    $stockAntes, $costoAntes, $cantidad, $costoUnit,
                );

                $ing->stock          = $nuevoStock;
                $ing->costo_unitario = $nuevoCosto;
                $ing->save();

                MovimientoInventario::create([
                    'local_id'         => $local->id,
                    'ingrediente_id'   => $ing->id,
                    'tipo'             => 'entrada',
                    'cantidad'         => $cantidad,
                    'stock_resultante' => $nuevoStock,
                    'referencia'       => "compra:{$compra->id}",
                    'motivo'           => "Compra {$compra->codigo}"
                        .($input['proveedor'] ?? null ? " — {$input['proveedor']}" : ''),
                    'user_id'          => $userId,
                ]);
            }

            return $compra->load('detalles.ingrediente');
        });
    }

    public function anular(Compra $compra, ?int $userId = null): Compra
    {
        if ($compra->estado === 'anulada') {
            return $compra;  // idempotente
        }

        return DB::transaction(function () use ($compra, $userId) {
            $detalles = $compra->detalles()->with('ingrediente')->get();

            // Validar que el stock actual permita revertir
            $ingredienteIds = $detalles->pluck('ingrediente_id')->all();
            $ingredientes = Ingrediente::query()
                ->whereIn('id', $ingredienteIds)
                ->when(DB::connection()->getDriverName() === 'mysql', fn ($q) => $q->lockForUpdate())
                ->get()
                ->keyBy('id');

            $faltantes = [];
            foreach ($detalles as $d) {
                $ing = $ingredientes->get($d->ingrediente_id);
                if (! $ing) continue;
                if ((float) $ing->stock < (float) $d->cantidad) {
                    $faltantes[] = [
                        'ingrediente' => $ing->nombre,
                        'comprado'    => (float) $d->cantidad,
                        'stock_actual' => (float) $ing->stock,
                        'unidad'      => $ing->unidad,
                    ];
                }
            }

            if (! empty($faltantes)) {
                throw new CompraNoReversibleException(
                    "No se puede anular: parte del inventario ya se consumió.",
                    $faltantes,
                );
            }

            // Revertir stock + registrar movimientos de salida
            foreach ($detalles as $d) {
                $ing = $ingredientes->get($d->ingrediente_id);
                if (! $ing) continue;
                $nuevoStock = (float) $ing->stock - (float) $d->cantidad;
                $ing->stock = $nuevoStock;
                $ing->save();

                MovimientoInventario::create([
                    'local_id'         => $compra->local_id,
                    'ingrediente_id'   => $ing->id,
                    'tipo'             => 'salida',
                    'cantidad'         => (float) $d->cantidad,
                    'stock_resultante' => $nuevoStock,
                    'referencia'       => "compra:{$compra->id}:anulacion",
                    'motivo'           => "Anulación de compra {$compra->codigo}",
                    'user_id'          => $userId,
                ]);
            }

            $compra->update(['estado' => 'anulada']);
            return $compra->fresh('detalles.ingrediente');
        });
    }

    protected function promedioPonderado(
        float $stockAntes, float $costoAntes,
        float $cantidadCompra, float $costoCompra,
    ): float {
        $totalStock = $stockAntes + $cantidadCompra;
        if ($totalStock <= 0) return $costoCompra;
        return round(
            (($stockAntes * $costoAntes) + ($cantidadCompra * $costoCompra)) / $totalStock,
            2,
        );
    }
}
