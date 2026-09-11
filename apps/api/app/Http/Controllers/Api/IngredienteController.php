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
use App\Models\Producto;
use App\Models\Receta;
use App\Models\ToppingGroup;
use App\Services\Inventory\UnitConverter;
use App\Support\CsvResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
     *
     *     @OA\Parameter(name="bajo_stock", in="query", @OA\Schema(type="boolean")),
     *
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
                'local_id' => $ing->local_id,
                'ingrediente_id' => $ing->id,
                'tipo' => 'entrada',
                'cantidad' => (float) $ing->stock,
                'stock_resultante' => (float) $ing->stock,
                'referencia' => 'alta',
                'motivo' => 'Stock inicial',
                'user_id' => $request->user()->id,
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
        $data = $request->validated();
        $desde = $ingrediente->unidad;
        $hasta = $data['unidad'] ?? $desde;
        $convertir = isset($data['unidad']) && UnitConverter::canConvert($desde, $hasta);

        DB::transaction(function () use ($ingrediente, $data, $convertir, $desde, $hasta) {
            if ($convertir) {
                // Los valores del formulario vienen en la unidad ANTERIOR; los
                // convertimos a la nueva. El costo por unidad se convierte en
                // sentido inverso (kg → g abarata el costo por unidad).
                if (array_key_exists('stock', $data)) {
                    $data['stock'] = UnitConverter::convertir((float) $data['stock'], $desde, $hasta);
                }
                if (array_key_exists('stock_minimo', $data)) {
                    $data['stock_minimo'] = UnitConverter::convertir((float) $data['stock_minimo'], $desde, $hasta);
                }
                if (array_key_exists('costo_unitario', $data)) {
                    $data['costo_unitario'] = UnitConverter::convertir((float) $data['costo_unitario'], $hasta, $desde);
                }
                $this->convertirRecetas($ingrediente, $desde, $hasta);
            }

            $ingrediente->update($data);
        });

        return new IngredienteResource($ingrediente->fresh());
    }

    /**
     * Convierte las cantidades de receta que referencian este ingrediente,
     * de la unidad `$desde` a `$hasta`, para que el descuento de inventario
     * siga siendo correcto tras el cambio de unidad. Cubre:
     *  - `recetas.cantidad` (sólo las interpretadas en la unidad del ingrediente,
     *     es decir sin `unidad_consumo` propia).
     *  - snapshots JSON en `topping_groups.items[].receta[]`.
     *  - snapshots JSON en `productos.extras[].items[].receta[]`.
     */
    private function convertirRecetas(Ingrediente $ing, string $desde, string $hasta): void
    {
        $id = $ing->id;

        // 1. Recetas (tabla). Sólo las que usan la unidad del ingrediente.
        Receta::query()
            ->where('ingrediente_id', $id)
            ->whereNull('unidad_consumo')
            ->get()
            ->each(function (Receta $r) use ($desde, $hasta) {
                $r->cantidad = UnitConverter::convertir((float) $r->cantidad, $desde, $hasta);
                $r->save();
            });

        // 2. Toppings del catálogo (JSON items[].receta[]).
        ToppingGroup::query()->withoutGlobalScopes()->where('local_id', $ing->local_id)->get()
            ->each(function (ToppingGroup $g) use ($id, $desde, $hasta) {
                [$items, $tocado] = $this->convertirItemsReceta($g->items ?? [], $id, $desde, $hasta);
                if ($tocado) {
                    $g->items = $items;
                    $g->save();
                }
            });

        // 3. Productos (JSON extras[].items[].receta[]).
        Producto::query()->withoutGlobalScopes()->where('local_id', $ing->local_id)->get()
            ->each(function (Producto $p) use ($id, $desde, $hasta) {
                $extras = $p->extras ?? [];
                $tocadoGrupo = false;
                foreach ($extras as $gi => $grupo) {
                    [$items, $tocado] = $this->convertirItemsReceta($grupo['items'] ?? [], $id, $desde, $hasta);
                    if ($tocado) {
                        $extras[$gi]['items'] = $items;
                        $tocadoGrupo = true;
                    }
                }
                if ($tocadoGrupo) {
                    $p->extras = $extras;
                    $p->save();
                }
            });
    }

    /**
     * Convierte las cantidades de receta dentro de un arreglo de items (opciones).
     *
     * @return array{0: array<int, mixed>, 1: bool} items actualizados + si hubo cambios
     */
    private function convertirItemsReceta(array $items, int $ingredienteId, string $desde, string $hasta): array
    {
        $tocado = false;
        foreach ($items as $ii => $item) {
            foreach (($item['receta'] ?? []) as $ri => $r) {
                if ((int) ($r['ingrediente_id'] ?? 0) === $ingredienteId) {
                    $items[$ii]['receta'][$ri]['cantidad'] = UnitConverter::convertir((float) $r['cantidad'], $desde, $hasta);
                    $tocado = true;
                }
            }
        }

        return [$items, $tocado];
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
     *
     *     @OA\Parameter(name="ingrediente", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"tipo","cantidad"},
     *
     *         @OA\Property(property="tipo", type="string", enum={"entrada","ajuste","merma"}),
     *         @OA\Property(property="cantidad", type="number", description="Positivo suma, negativo resta. Cero rechazado."),
     *         @OA\Property(property="motivo", type="string")
     *     )),
     *
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function ajustar(AjusteStockRequest $request, Ingrediente $ingrediente): IngredienteResource
    {
        $cantidad = (float) $request->input('cantidad');
        $tipo = $request->string('tipo')->toString();

        $resultado = DB::transaction(function () use ($ingrediente, $cantidad, $tipo, $request) {
            $ingrediente->refresh();
            $nuevoStock = max(0.0, (float) $ingrediente->stock + $cantidad);
            $ingrediente->stock = $nuevoStock;
            $ingrediente->save();

            MovimientoInventario::create([
                'local_id' => $ingrediente->local_id,
                'ingrediente_id' => $ingrediente->id,
                'tipo' => $tipo,
                'cantidad' => $cantidad,
                'stock_resultante' => $nuevoStock,
                'referencia' => 'manual',
                'motivo' => $request->input('motivo'),
                'user_id' => $request->user()->id,
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
     *
     *     @OA\Parameter(name="ingrediente", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="tipo", in="query", description="entrada|salida|ajuste|merma"),
     *     @OA\Parameter(name="desde", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="hasta", in="query", @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=30)),
     *
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
    public function export(): StreamedResponse
    {
        $filename = 'inventario-'.now()->format('Y-m-d').'.csv';

        return CsvResponse::stream(
            $filename,
            ['Nombre', 'Unidad', 'Stock', 'Stock mínimo', 'Costo unitario', 'Bajo stock'],
            function () {
                foreach (Ingrediente::query()->orderBy('nombre')->cursor() as $i) {
                    yield [
                        $i->nombre,
                        $i->unidad,
                        number_format((float) $i->stock, 3, '.', ''),
                        number_format((float) ($i->stock_minimo ?? 0), 3, '.', ''),
                        number_format((float) ($i->costo_unitario ?? 0), 2, '.', ''),
                        $i->bajo_stock ? 'sí' : 'no',
                    ];
                }
            },
        );
    }
}
