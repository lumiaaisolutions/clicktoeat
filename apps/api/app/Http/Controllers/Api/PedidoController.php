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

        // Filtro soft-delete
        if ($request->input('trashed') === 'only') {
            $query->onlyTrashed();
        } elseif ($request->input('trashed') === 'with') {
            $query->withTrashed();
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->string('estado'));
        }

        // F84 — filtro por canal del staff (notif_filtro). El owner siempre ve todo.
        $user = $request->user();
        if ($user && ! $user->isOwner() && ! $user->isSuperAdmin()) {
            switch ($user->notif_filtro ?? 'todos') {
                case 'cocina':   $query->whereIn('metodo_entrega', ['pickup', 'delivery']); break;
                case 'caja':     $query->where('metodo_entrega', 'sucursal'); break;
                case 'delivery': $query->where('metodo_entrega', 'delivery'); break;
                case 'ninguno':  $query->whereRaw('1 = 0'); break;
                // 'todos' (default) → sin filtro
            }
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return PedidoResource::collection(
            $query->orderByDesc('id')->paginate($perPage)
        );
    }

    /**
     * @OA\Post(
     *     path="/pedidos/{pedido}/restore",
     *     tags={"Pedidos"},
     *     security={{"sanctum":{}}},
     *     summary="Restaura un pedido soft-deleted.",
     *     @OA\Parameter(name="pedido", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function restore(int $id): PedidoResource
    {
        $pedido = Pedido::withTrashed()->findOrFail($id);
        $this->authorize('restore', $pedido);

        $pedido->restore();

        return new PedidoResource($pedido->fresh()->load('detalles'));
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

    /**
     * Exporta pedidos del local a CSV. Acepta filtros:
     *   ?from=2026-06-01&to=2026-06-30&estado=entregado
     *
     * Streaming con cursor() — no carga todo en memoria.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $q = Pedido::query()->orderBy('created_at', 'desc');
        if ($from = $request->input('from'))     $q->where('created_at', '>=', $from);
        if ($to = $request->input('to'))         $q->where('created_at', '<=', $to.' 23:59:59');
        if ($estado = $request->input('estado')) $q->where('estado', $estado);

        $filename = 'pedidos-'.now()->format('Y-m-d').'.csv';

        return \App\Support\CsvResponse::stream(
            $filename,
            ['Código', 'Fecha', 'Cliente', 'Teléfono', 'Entrega', 'Pago', 'Subtotal', 'Envío', 'Descuento', 'Total', 'Cupón', 'Estado', 'Programado para'],
            function () use ($q) {
                foreach ($q->cursor() as $p) {
                    yield [
                        $p->codigo,
                        $p->created_at?->format('Y-m-d H:i') ?? '',
                        $p->cliente_nombre,
                        $p->cliente_telefono,
                        $p->metodo_entrega,
                        $p->metodo_pago,
                        number_format((float) $p->subtotal,     2, '.', ''),
                        number_format((float) $p->delivery_fee, 2, '.', ''),
                        number_format((float) $p->descuento,    2, '.', ''),
                        number_format((float) $p->total,        2, '.', ''),
                        $p->cupon_codigo ?? '',
                        $p->estado,
                        $p->programado_para?->format('Y-m-d H:i') ?? '',
                    ];
                }
            },
        );
    }
}
