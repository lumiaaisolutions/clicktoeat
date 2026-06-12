<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Compra\StoreCompraRequest;
use App\Http\Resources\CompraResource;
use App\Models\Compra;
use App\Models\Local;
use App\Services\Compras\CompraNoReversibleException;
use App\Services\Compras\CompraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Tag(name="Compras", description="Captura de mercancía recibida del proveedor.")
 */
class CompraController extends Controller
{
    public function __construct(protected CompraService $service) {}

    /**
     * @OA\Get(
     *     path="/compras",
     *     tags={"Compras"},
     *     security={{"sanctum":{}}},
     *     summary="Lista paginada de compras del local.",
     *     @OA\Parameter(name="estado", in="query", @OA\Schema(type="string", enum={"registrada","anulada"})),
     *     @OA\Parameter(name="desde", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=20)),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Compra::class);

        $query = Compra::query()->with('usuario:id,nombre');

        // Filtro soft-delete
        if ($request->input('trashed') === 'only') {
            $query->onlyTrashed();
        } elseif ($request->input('trashed') === 'with') {
            $query->withTrashed();
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->string('estado'));
        }
        if ($request->filled('desde')) {
            $query->whereDate('fecha', '>=', $request->date('desde'));
        }
        if ($request->filled('hasta')) {
            $query->whereDate('fecha', '<=', $request->date('hasta'));
        }

        $perPage = min((int) $request->input('per_page', 20), 100);
        return CompraResource::collection(
            $query->orderByDesc('fecha')->orderByDesc('id')->paginate($perPage)
        );
    }

    /**
     * @OA\Post(
     *     path="/compras/{compra}/restore",
     *     tags={"Compras"},
     *     security={{"sanctum":{}}},
     *     summary="Restaura una compra soft-deleted (no la des-anula — sólo recupera la fila).",
     *     @OA\Parameter(name="compra", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function restore(int $id): CompraResource
    {
        $compra = Compra::withTrashed()->findOrFail($id);
        $this->authorize('restore', $compra);

        $compra->restore();

        return new CompraResource($compra->fresh(['detalles.ingrediente', 'usuario:id,nombre']));
    }

    /**
     * @OA\Post(
     *     path="/compras",
     *     tags={"Compras"},
     *     security={{"sanctum":{}}},
     *     summary="Registra una compra. Aumenta stock + actualiza costo promedio ponderado + crea movimientos."
     * )
     */
    public function store(StoreCompraRequest $request): JsonResponse
    {
        $local = Local::withoutGlobalScopes()->findOrFail($request->user()->local_id);

        $compra = $this->service->registrar(
            $local,
            $request->validated(),
            $request->user()->id,
        );

        return (new CompraResource($compra))->response()->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/compras/{compra}",
     *     tags={"Compras"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="compra", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Compra $compra): CompraResource
    {
        $this->authorize('view', $compra);
        return new CompraResource($compra->load(['detalles.ingrediente', 'usuario:id,nombre']));
    }

    /**
     * @OA\Delete(
     *     path="/compras/{compra}",
     *     tags={"Compras"},
     *     security={{"sanctum":{}}},
     *     summary="Anula la compra: marca anulada + revierte stock. Falla 409 si ya se consumió parte.",
     *     @OA\Parameter(name="compra", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Anulada"),
     *     @OA\Response(response=409, description="No reversible (stock insuficiente)")
     * )
     */
    public function destroy(Request $request, Compra $compra): JsonResponse|CompraResource
    {
        $this->authorize('delete', $compra);

        try {
            $compra = $this->service->anular($compra, $request->user()->id);
        } catch (CompraNoReversibleException $e) {
            return response()->json([
                'message'   => $e->getMessage(),
                'faltantes' => $e->faltantes,
            ], 409);
        }

        return new CompraResource($compra->load('detalles.ingrediente'));
    }
}
