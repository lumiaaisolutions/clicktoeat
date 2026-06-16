<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ingrediente\AjusteStockRequest;
use App\Http\Requests\Ingrediente\StoreIngredienteRequest;
use App\Http\Requests\Ingrediente\UpdateIngredienteRequest;
use App\Http\Resources\IngredienteResource;
use App\Http\Resources\MovimientoInventarioResource;
use App\Models\Ingrediente;
use App\Models\MovimientoInventario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(name="Ingredientes", description="Inventario por ingrediente del local.")
 */
class IngredienteController extends Controller
{
    /**
     * @OA\Get(
     *     path="/ingredientes",
     *     tags={"Ingredientes"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="bajo_stock", in="query", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Ingrediente::class);

        $query = Ingrediente::query()->withCount('recetas');

        if ($request->boolean('bajo_stock')) {
            $query->whereColumn('stock', '<=', 'stock_minimo');
        }

        return IngredienteResource::collection(
            $query->orderBy('nombre')->get()
        );
    }

    public function store(StoreIngredienteRequest $request): JsonResponse
    {
        $ing = Ingrediente::create($request->validated());

        // Movimiento inicial
        if ((float) $ing->stock > 0) {
            MovimientoInventario::create([
                'local_id'         => $ing->local_id,
                'ingrediente_id'   => $ing->id,
                'tipo'             => 'entrada',
                'cantidad'         => (float) $ing->stock,
                'stock_resultante' => (float) $ing->stock,
                'referencia'       => 'alta',
                'motivo'           => 'Stock inicial',
                'user_id'          => $request->user()->id,
            ]);
        }

        return (new IngredienteResource($ing))->response()->setStatusCode(201);
    }

    public function show(Ingrediente $ingrediente): IngredienteResource
    {
        $this->authorize('view', $ingrediente);
        return new IngredienteResource($ingrediente->loadCount('recetas'));
    }

    public function update(UpdateIngredienteRequest $request, Ingrediente $ingrediente): IngredienteResource
    {
        $ingrediente->update($request->validated());
        return new IngredienteResource($ingrediente->fresh());
    }

    public function destroy(Ingrediente $ingrediente): JsonResponse
    {
        $this->authorize('delete', $ingrediente);

        if ($ingrediente->recetas()->count() > 0) {
            return response()->json([
                'message' => 'No se puede eliminar: hay productos con receta que lo usan.',
            ], 409);
        }

        $ingrediente->delete();
        return response()->json(null, 204);
    }

    /**
     * @OA\Post(
     *     path="/ingredientes/{ingrediente}/ajuste",
     *     tags={"Ingredientes"},
     *     security={{"sanctum":{}}},
     *     summary="Registra una entrada / ajuste / merma de stock.",
     *     @OA\Parameter(name="ingrediente", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"tipo","cantidad"},
     *         @OA\Property(property="tipo", type="string", enum={"entrada","ajuste","merma"}),
     *         @OA\Property(property="cantidad", type="number", description="Positivo suma, negativo resta. Cero rechazado."),
     *         @OA\Property(property="motivo", type="string")
     *     )),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function ajustar(AjusteStockRequest $request, Ingrediente $ingrediente): IngredienteResource
    {
        $cantidad = (float) $request->input('cantidad');
        $tipo     = $request->string('tipo')->toString();

        $resultado = DB::transaction(function () use ($ingrediente, $cantidad, $tipo, $request) {
            $ingrediente->refresh();
            $nuevoStock = max(0.0, (float) $ingrediente->stock + $cantidad);
            $ingrediente->stock = $nuevoStock;
            $ingrediente->save();

            MovimientoInventario::create([
                'local_id'         => $ingrediente->local_id,
                'ingrediente_id'   => $ingrediente->id,
                'tipo'             => $tipo,
                'cantidad'         => $cantidad,
                'stock_resultante' => $nuevoStock,
                'referencia'       => 'manual',
                'motivo'           => $request->input('motivo'),
                'user_id'          => $request->user()->id,
            ]);

            return $ingrediente;
        });

        return new IngredienteResource($resultado);
    }

    /**
     * @OA\Get(
     *     path="/ingredientes/{ingrediente}/movimientos",
     *     tags={"Ingredientes"},
     *     security={{"sanctum":{}}},
     *     summary="Historial de movimientos (entradas / salidas / ajustes / mermas).",
     *     @OA\Parameter(name="ingrediente", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="tipo", in="query", description="entrada|salida|ajuste|merma"),
     *     @OA\Parameter(name="desde", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=30)),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function movimientos(Request $request, Ingrediente $ingrediente): AnonymousResourceCollection
    {
        $this->authorize('view', $ingrediente);

        $query = MovimientoInventario::query()
            ->where('ingrediente_id', $ingrediente->id)
            ->with('usuario:id,nombre,email');

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->string('tipo'));
        }
        if ($request->filled('desde')) {
            $query->whereDate('created_at', '>=', $request->date('desde'));
        }
        if ($request->filled('hasta')) {
            $query->whereDate('created_at', '<=', $request->date('hasta'));
        }

        $perPage = min((int) $request->input('per_page', 30), 100);

        return MovimientoInventarioResource::collection(
            $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage)
        );
    }

    /** Exporta inventario completo del local a CSV. */
    public function export(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $filename = 'inventario-'.now()->format('Y-m-d').'.csv';
        return \App\Support\CsvResponse::stream(
            $filename,
            ['Nombre', 'Unidad', 'Stock', 'Stock mínimo', 'Costo unitario', 'Bajo stock'],
            function () {
                foreach (Ingrediente::query()->orderBy('nombre')->cursor() as $i) {
                    yield [
                        $i->nombre,
                        $i->unidad,
                        number_format((float) $i->stock,          3, '.', ''),
                        number_format((float) ($i->stock_minimo ?? 0), 3, '.', ''),
                        number_format((float) ($i->costo_unitario ?? 0), 2, '.', ''),
                        $i->bajo_stock ? 'sí' : 'no',
                    ];
                }
            },
        );
    }
}
