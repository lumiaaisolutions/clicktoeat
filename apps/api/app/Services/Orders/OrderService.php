<?php

namespace App\Services\Orders;

use App\Models\DetallePedido;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use App\Services\Inventory\InventoryService;
use App\Services\WhatsApp\WhatsAppLinkBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Crea pedidos snapshotteando precios y descontando inventario.
 *
 * Tomamos snapshot del nombre/precio del producto en el momento del pedido
 * porque los productos pueden cambiar después (precio, baja, rename).
 */
class OrderService
{
    public function __construct(
        protected InventoryService    $inventory,
        protected WhatsAppLinkBuilder $whatsapp,
    ) {}

    /**
     * @param array{
     *   cliente: array{nombre:string, telefono:string, direccion?:?string, notas?:?string},
     *   metodo_entrega: 'pickup'|'delivery',
     *   metodo_pago: 'efectivo'|'tarjeta_entrega'|'transferencia',
     *   items: array<int, array{producto_id:int, cantidad:int, extras?:array, notas?:?string}>,
     * } $input
     */
    public function crear(Local $local, array $input): Pedido
    {
        if (empty($input['items'])) {
            throw new RuntimeException('El pedido no tiene productos.');
        }

        // 1. Cargar productos referenciados (filtrados a este local y disponibles)
        $productoIds = array_unique(array_column($input['items'], 'producto_id'));
        $productos = Producto::query()
            ->withoutTenantScope()
            ->where('local_id', $local->id)
            ->whereIn('id', $productoIds)
            ->where('disponible', true)
            ->get()
            ->keyBy('id');

        if ($productos->count() !== count($productoIds)) {
            throw new RuntimeException('Uno o más productos no existen o no están disponibles.');
        }

        // 2. Snapshot precios y armar líneas + subtotal
        [$lineas, $subtotal] = $this->snapshotLineas($input['items'], $productos);

        $deliveryFee = $input['metodo_entrega'] === 'delivery'
            ? (float) $local->delivery_fee
            : 0.0;

        $total = $subtotal + $deliveryFee;

        // 3. Transacción: crear pedido + detalles + descuento de inventario
        return DB::transaction(function () use ($local, $input, $lineas, $subtotal, $deliveryFee, $total) {
            $pedido = Pedido::create([
                'local_id'         => $local->id,
                'cliente_nombre'   => $input['cliente']['nombre'],
                'cliente_telefono' => $input['cliente']['telefono'],
                'direccion'        => $input['cliente']['direccion']   ?? null,
                'notas'            => $input['cliente']['notas']       ?? null,
                'metodo_entrega'   => $input['metodo_entrega'],
                'metodo_pago'      => $input['metodo_pago'],
                'subtotal'         => $subtotal,
                'delivery_fee'     => $deliveryFee,
                'descuento'        => 0,
                'total'            => $total,
                'estado'           => 'nuevo',
            ]);

            foreach ($lineas as $linea) {
                DetallePedido::create([
                    'pedido_id'             => $pedido->id,
                    'producto_id'           => $linea['producto_id'],
                    'producto_nombre'       => $linea['producto_nombre'],
                    'precio_unitario'       => $linea['precio_unitario'],
                    'cantidad'              => $linea['cantidad'],
                    'subtotal'              => $linea['subtotal'],
                    'extras_seleccionados'  => $linea['extras'],
                    'notas'                 => $linea['notas'],
                ]);
            }

            // Cargar relación para el builder de whatsapp
            $pedido->load('detalles');

            // Inventario — lanza InsufficientStockException → rollback automático
            $this->inventory->descontarParaPedido(
                $pedido,
                array_map(fn ($l) => ['producto_id' => $l['producto_id'], 'cantidad' => $l['cantidad']], $lineas),
            );

            // 4. WhatsApp URL — sólo para pickup/delivery (el cliente la abre).
            //    Pedidos en sucursal NO la necesitan (el cliente está físicamente en caja).
            if ($pedido->metodo_entrega !== 'sucursal') {
                $pedido->whatsapp_url = $this->whatsapp->buildForPedido($pedido);
                $pedido->save();
            }

            return $pedido;
        });
    }

    /**
     * @return array{0: array<int, array<string, mixed>>, 1: float}
     */
    protected function snapshotLineas(array $items, Collection $productos): array
    {
        $lineas   = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $producto = $productos->get($item['producto_id']);
            $cantidad = max(1, (int) $item['cantidad']);

            $extras = $item['extras'] ?? [];
            $extrasTotal = 0.0;
            foreach ($extras as $extra) {
                $extrasTotal += (float) ($extra['price'] ?? 0);
            }

            $precioUnitario = (float) $producto->precio + $extrasTotal;
            $subtotalLinea  = $precioUnitario * $cantidad;

            $lineas[] = [
                'producto_id'      => $producto->id,
                'producto_nombre'  => $producto->nombre,
                'precio_unitario'  => $precioUnitario,
                'cantidad'         => $cantidad,
                'subtotal'         => $subtotalLinea,
                'extras'           => $extras,
                'notas'            => $item['notas'] ?? null,
            ];
            $subtotal += $subtotalLinea;
        }

        return [$lineas, $subtotal];
    }
}
