<?php

namespace App\Services\Inventory;

use App\Models\Ingrediente;
use App\Models\MovimientoInventario;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Receta;
use Illuminate\Support\Facades\DB;

/**
 * Maneja el stock automático de ingredientes para un pedido.
 *
 * Capacidades:
 *  - `descontarParaPedido`: baja stock + registra movimientos. Lanza
 *    InsufficientStockException si algo no alcanza (transacción rollback).
 *  - `reintegrarParaPedido`: vuelve a sumar el stock al cancelar un pedido,
 *    idempotente (no duplica si ya se reintegró).
 *  - Soporta producto compuesto (Receta::componente_producto_id) expandiendo
 *    recursivamente. Detecta ciclos (A → B → A) y lanza excepción.
 *  - Después de descontar, si un ingrediente cruza por debajo del umbral
 *    `stock_minimo`, crea una Notificacion de tipo `bajo_stock`.
 *
 * Productos sin receta no descuentan ni reintegran nada (caso válido).
 *
 * Debe llamarse dentro de una DB::transaction() para que el locking + rollback
 * funcione. OrderService y PedidoController::updateEstado se encargan de envolver.
 */
class InventoryService
{
    /**
     * Descuenta inventario para un pedido nuevo.
     *
     * @param array<int, array{producto_id:int, cantidad:int}> $lineas
     */
    public function descontarParaPedido(Pedido $pedido, array $lineas): void
    {
        if (! DB::transactionLevel()) {
            throw new \LogicException(__METHOD__.' debe correr dentro de DB::transaction.');
        }

        $consumo = $this->calcularConsumo($lineas);
        if (empty($consumo)) return;

        $ingredientes = $this->lockAndFetch(array_keys($consumo));

        $faltantes = [];
        foreach ($consumo as $ingId => $cantidad) {
            $ing = $ingredientes->get($ingId);
            if (! $ing) continue;
            if ((float) $ing->stock < $cantidad) {
                $faltantes[] = [
                    'ingrediente' => $ing->nombre,
                    'requerido'   => round($cantidad, 3),
                    'disponible'  => (float) $ing->stock,
                    'unidad'      => $ing->unidad,
                ];
            }
        }

        if (! empty($faltantes)) {
            throw new InsufficientStockException($faltantes);
        }

        foreach ($consumo as $ingId => $cantidad) {
            $ing = $ingredientes->get($ingId);
            if (! $ing) continue;

            $stockAntes = (float) $ing->stock;
            $nuevoStock = $stockAntes - $cantidad;
            $ing->stock = $nuevoStock;
            $ing->save();

            MovimientoInventario::create([
                'local_id'         => $pedido->local_id,
                'ingrediente_id'   => $ing->id,
                'tipo'             => 'salida',
                'cantidad'         => $cantidad,
                'stock_resultante' => $nuevoStock,
                'referencia'       => "pedido:{$pedido->id}",
                'motivo'           => 'Descuento automático por pedido',
            ]);

            // Si cruzamos el umbral mínimo en esta operación, notificar.
            $umbral = (float) $ing->stock_minimo;
            if ($stockAntes > $umbral && $nuevoStock <= $umbral) {
                $this->notificarBajoStock($pedido->local_id, $ing);
            }
        }
    }

    /**
     * Reintegra el stock cuando un pedido se cancela.
     *
     * Idempotente: si ya existen movimientos de "reintegro" para este pedido,
     * no duplica.
     */
    public function reintegrarParaPedido(Pedido $pedido): void
    {
        if (! DB::transactionLevel()) {
            throw new \LogicException(__METHOD__.' debe correr dentro de DB::transaction.');
        }

        $refSalida    = "pedido:{$pedido->id}";
        $refReintegro = "pedido:{$pedido->id}:reintegro";

        if (MovimientoInventario::where('referencia', $refReintegro)->exists()) {
            return;
        }

        $salidas = MovimientoInventario::where('referencia', $refSalida)
            ->where('tipo', 'salida')
            ->get()
            ->groupBy('ingrediente_id')
            ->map(fn ($grupo) => (float) $grupo->sum('cantidad'));

        if ($salidas->isEmpty()) return;

        $ingredientes = $this->lockAndFetch($salidas->keys()->all());

        foreach ($salidas as $ingId => $cantidad) {
            $ing = $ingredientes->get($ingId);
            if (! $ing) continue;

            $nuevoStock = (float) $ing->stock + (float) $cantidad;
            $ing->stock = $nuevoStock;
            $ing->save();

            MovimientoInventario::create([
                'local_id'         => $pedido->local_id,
                'ingrediente_id'   => $ing->id,
                'tipo'             => 'entrada',
                'cantidad'         => (float) $cantidad,
                'stock_resultante' => $nuevoStock,
                'referencia'       => $refReintegro,
                'motivo'           => 'Reintegro por cancelación de pedido',
            ]);
        }
    }

    // ────────────────────────────────────────────────────────────
    //  internos
    // ────────────────────────────────────────────────────────────

    protected function lockAndFetch(array $ingredienteIds)
    {
        return Ingrediente::query()
            ->whereIn('id', $ingredienteIds)
            ->when(DB::connection()->getDriverName() === 'mysql', fn ($q) => $q->lockForUpdate())
            ->get()
            ->keyBy('id');
    }

    /**
     * @param array<int, array{producto_id:int, cantidad:int}> $lineas
     * @return array<int, float>  ingrediente_id => cantidad_total
     */
    protected function calcularConsumo(array $lineas): array
    {
        $consumo = [];
        foreach ($lineas as $linea) {
            $this->expandirProducto(
                (int) $linea['producto_id'],
                (float) $linea['cantidad'],
                $consumo,
                visitados: [],
            );
        }
        return $consumo;
    }

    /**
     * Recursivamente expande un producto a sus ingredientes hoja.
     * Detecta ciclos vía $visitados (cadena actual).
     *
     * @param array<int, float> $consumo
     * @param array<int, bool>  $visitados
     */
    protected function expandirProducto(int $productoId, float $multiplicador, array &$consumo, array $visitados): void
    {
        if (isset($visitados[$productoId])) {
            throw new \RuntimeException(
                "Ciclo detectado en receta del producto {$productoId}. Un producto no puede ser componente directo o indirecto de sí mismo.",
            );
        }
        $visitados[$productoId] = true;

        $recetas = Receta::where('producto_id', $productoId)->get();
        if ($recetas->isEmpty()) return;

        foreach ($recetas as $r) {
            $totalNeeded = (float) $r->cantidad * $multiplicador;

            if ($r->ingrediente_id) {
                // F91 — si la receta declara `unidad_consumo` distinta a la
                // unidad del ingrediente, convertimos antes de descontar.
                if (! empty($r->unidad_consumo)) {
                    $ing = \App\Models\Ingrediente::find($r->ingrediente_id);
                    if ($ing && ! empty($ing->unidad)) {
                        $totalNeeded = \App\Services\Inventory\UnitConverter::convertir(
                            $totalNeeded,
                            $r->unidad_consumo,
                            $ing->unidad,
                        );
                    }
                }
                $consumo[$r->ingrediente_id] = ($consumo[$r->ingrediente_id] ?? 0) + $totalNeeded;
            } elseif ($r->componente_producto_id) {
                $this->expandirProducto((int) $r->componente_producto_id, $totalNeeded, $consumo, $visitados);
            }
        }
    }

    protected function notificarBajoStock(int $localId, Ingrediente $ing): void
    {
        // Evita spamear: si ya hay una notificación no leída para este ingrediente
        $existe = Notificacion::query()
            ->where('local_id', $localId)
            ->where('tipo', 'bajo_stock')
            ->whereNull('leida_at')
            ->where('data->ingrediente_id', $ing->id)
            ->exists();

        if ($existe) return;

        Notificacion::create([
            'local_id' => $localId,
            'tipo'     => 'bajo_stock',
            'titulo'   => "Bajo stock: {$ing->nombre}",
            'mensaje'  => "Quedan {$ing->stock} {$ing->unidad} de {$ing->nombre} (mínimo: {$ing->stock_minimo}).",
            'data'     => [
                'ingrediente_id' => $ing->id,
                'stock'          => (float) $ing->stock,
                'stock_minimo'   => (float) $ing->stock_minimo,
                'unidad'         => $ing->unidad,
            ],
        ]);
    }
}
