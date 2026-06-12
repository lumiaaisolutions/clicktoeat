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
        $pedido = DB::transaction(function () use ($local, $input, $lineas, $subtotal, $deliveryFee, $total) {
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

        // Broadcast del nuevo pedido — ShouldBroadcastAfterCommit garantiza que
        // el evento se dispare SÓLO si la transacción se commiteó (no en rollback
        // por InsufficientStockException). Si BROADCAST_CONNECTION no está
        // configurado, el evento se dispara pero no llega a nadie — frontend
        // sigue con polling como fallback.
        // Ver: docs/runbook/integrar-reverb.md
        event(new \App\Events\PedidoCreado($pedido));

        return $pedido;
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

            // CRÍTICO: los extras vienen del cliente. NUNCA confiar en su `price`
            // — validamos cada extra contra el catálogo del producto y reemplazamos
            // el precio con el valor canónico. Sin esto, un atacante puede
            // bajar el total mandando `price: -100` o `price: 0`.
            // Ver: docs/security/threat-model.md vector #8.
            $extras = $this->validarYNormalizarExtras(
                $item['extras'] ?? [],
                $producto,
            );

            $extrasTotal = 0.0;
            foreach ($extras as $extra) {
                $extrasTotal += (float) $extra['price'];
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

    /**
     * Valida cada extra contra `$producto->extras` y reemplaza el precio del
     * cliente con el precio canónico del catálogo. Rechaza grupos / items
     * que no existen.
     *
     * Estructura esperada del cliente (cada item):
     *   { group: "Tortilla", item: "Harina", price: 5 }
     *
     * Estructura del catálogo en `Producto::$extras` (JSON):
     *   [
     *     { group: "Tortilla", kind: "one", required: true,
     *       items: [{ id: "harina", name: "Harina", price: 5 }, ...] }
     *   ]
     *
     * Match se hace por `group` (exacto) + `item` (matchea con item.name O item.id).
     */
    protected function validarYNormalizarExtras(array $extrasCliente, \App\Models\Producto $producto): array
    {
        if (empty($extrasCliente)) {
            return [];
        }

        $catalogo = $producto->extras ?? [];
        // Index del catálogo: ['Tortilla' => ['harina' => price, 'maiz' => price, ...]]
        $byGroup = [];
        foreach ($catalogo as $grupo) {
            $groupName = $grupo['group'] ?? null;
            if (! $groupName) continue;
            $byGroup[$groupName] = [];
            foreach (($grupo['items'] ?? []) as $catItem) {
                // Permitir match por `id` o por `name`
                $price = (float) ($catItem['price'] ?? 0);
                if (isset($catItem['id']))   $byGroup[$groupName][$catItem['id']]   = $price;
                if (isset($catItem['name'])) $byGroup[$groupName][$catItem['name']] = $price;
            }
        }

        $normalizados = [];
        foreach ($extrasCliente as $extra) {
            $group = $extra['group'] ?? null;
            $item  = $extra['item']  ?? null;

            if (! $group || ! $item) {
                throw new \RuntimeException("Extra inválido: requiere 'group' e 'item'.");
            }
            if (! isset($byGroup[$group])) {
                throw new \RuntimeException(
                    "Extra rechazado: grupo '{$group}' no existe en el producto '{$producto->nombre}'.",
                );
            }
            if (! array_key_exists($item, $byGroup[$group])) {
                throw new \RuntimeException(
                    "Extra rechazado: item '{$item}' no existe en el grupo '{$group}' del producto '{$producto->nombre}'.",
                );
            }

            // Snapshot con el precio canónico del catálogo (ignora lo que vino del cliente)
            $normalizados[] = [
                'group' => $group,
                'item'  => $item,
                'price' => $byGroup[$group][$item],
            ];
        }

        return $normalizados;
    }
}
