<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pedido\StoreInternalPedidoRequest;
use App\Http\Requests\Pedido\UpdateEstadoPedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\Local;
use App\Models\Pedido;
use App\Services\Inventory\InsufficientStockException;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Tag(name="Pedidos", description="Pedidos del local autenticado.")
 */
class PedidoController extends Controller
{
    public function __construct(
        protected OrderService $orders,
        protected \App\Services\Inventory\InventoryService $inventory,
    ) {}

    /**
     * @OA\Post(
     *     path="/pedidos",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     summary="Crea un pedido desde el punto de venta presencial (caja / sucursal).",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"metodo_entrega","metodo_pago","items"},
     *         @OA\Property(property="cliente", type="object",
     *             @OA\Property(property="nombre", type="string", description="Default 'Mostrador'"),
     *             @OA\Property(property="telefono", type="string"),
     *             @OA\Property(property="notas", type="string")
     *         ),
     *         @OA\Property(property="metodo_entrega", type="string", enum={"pickup","delivery","sucursal"}),
     *         @OA\Property(property="metodo_pago", type="string", enum={"efectivo","tarjeta_entrega","tarjeta_tpv","transferencia"}),
     *         @OA\Property(property="items", type="array", @OA\Items(type="object"))
     *     )),
     *     @OA\Response(response=201, description="Created"),
     *     @OA\Response(response=409, description="Stock insuficiente")
     * )
     */
    public function store(StoreInternalPedidoRequest $request): JsonResponse
    {
        $local = Local::withoutGlobalScopes()->findOrFail($request->user()->local_id);

        try {
            $pedido = $this->orders->crear($local, $request->toOrderInput());
        } catch (InsufficientStockException $e) {
            return response()->json([
                'message'   => $e->getMessage(),
                'faltantes' => $e->faltantes,
            ], 409);
        }

        // Pedido de sucursal: marcar como confirmado automáticamente (ya está en caja)
        if ($pedido->metodo_entrega === 'sucursal' && $pedido->estado === 'nuevo') {
            $pedido->forceFill(['estado' => 'confirmado', 'confirmado_at' => now()])->save();
        }

        return (new PedidoResource($pedido->load('detalles')))->response()->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/pedidos",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     summary="Lista pedidos del local con filtros.",
     *     @OA\Parameter(name="estado", in="query", @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=20)),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Pedido::class);

        $query = Pedido::query()->with('detalles');

        if ($request->filled('estado')) {
            $query->where('estado', $request->string('estado'));
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return PedidoResource::collection(
            $query->orderByDesc('id')->paginate($perPage)
        );
    }

    /**
     * @OA\Get(
     *     path="/pedidos/{pedido}",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="pedido", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Pedido $pedido): PedidoResource
    {
        $this->authorize('view', $pedido);
        return new PedidoResource($pedido->load('detalles'));
    }

    /**
     * @OA\Patch(
     *     path="/pedidos/{pedido}/estado",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     summary="Cambia el estado del pedido.",
     *     @OA\Parameter(name="pedido", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"estado"},
     *         @OA\Property(property="estado", type="string",
     *             enum={"nuevo","confirmado","preparando","listo","en_camino","entregado","cancelado"})
     *     )),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function updateEstado(UpdateEstadoPedidoRequest $request, Pedido $pedido): PedidoResource
    {
        $nuevoEstado    = $request->string('estado')->toString();
        $estadoAnterior = $pedido->estado;

        \Illuminate\Support\Facades\DB::transaction(function () use ($pedido, $nuevoEstado, $estadoAnterior) {
            $pedido->estado = $nuevoEstado;

            if ($nuevoEstado === 'confirmado' && ! $pedido->confirmado_at) {
                $pedido->confirmado_at = now();
            }
            if ($nuevoEstado === 'entregado' && ! $pedido->entregado_at) {
                $pedido->entregado_at = now();
            }

            $pedido->save();

            // Re-stock: pedido se cancela tras haber consumido inventario → reintegrar.
            //  - No reintegra si el estado anterior ya era 'cancelado' (idempotencia)
            //  - No reintegra si era 'entregado' (ya se consumió de verdad)
            if (
                $nuevoEstado === 'cancelado'
                && $estadoAnterior !== 'cancelado'
                && $estadoAnterior !== 'entregado'
            ) {
                $this->inventory->reintegrarParaPedido($pedido);
            }
        });

        return new PedidoResource($pedido->load('detalles'));
    }

    /**
     * @OA\Delete(
     *     path="/pedidos/{pedido}",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="pedido", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Pedido $pedido): JsonResponse
    {
        $this->authorize('delete', $pedido);
        $pedido->delete();
        return response()->json(null, 204);
    }
}
