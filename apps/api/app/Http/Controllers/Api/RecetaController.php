<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Receta\SyncRecetaRequest;
use App\Http\Resources\RecetaResource;
use App\Models\Producto;
use App\Models\Receta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(name="Recetas", description="Receta (ingredientes por producto) — descuenta inventario al recibir pedidos.")
 */
class RecetaController extends Controller
{
    /**
     * @OA\Get(
     *     path="/productos/{producto}/recetas",
     *     tags={"Recetas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Producto $producto): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [Receta::class, $producto]);

        $recetas = Receta::where('producto_id', $producto->id)
            ->with('ingrediente')
            ->orderBy('id')
            ->get();

        return RecetaResource::collection($recetas);
    }

    /**
     * @OA\Put(
     *     path="/productos/{producto}/recetas",
     *     tags={"Recetas"},
     *     security={{"sanctum":{}}},
     *     summary="Reemplaza completamente la receta de un producto (operación idempotente).",
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"recetas"},
     *         @OA\Property(property="recetas", type="array", @OA\Items(
     *             required={"ingrediente_id","cantidad"},
     *             @OA\Property(property="ingrediente_id", type="integer"),
     *             @OA\Property(property="cantidad", type="number")
     *         ))
     *     )),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function sync(SyncRecetaRequest $request, Producto $producto): AnonymousResourceCollection
    {
        $recetas = $request->input('recetas', []);

        DB::transaction(function () use ($producto, $recetas) {
            Receta::where('producto_id', $producto->id)->delete();

            // Deduplicar — una sola línea por (ingrediente_id) o (componente_producto_id)
            $byIngrediente = [];
            $byComponente  = [];
            foreach ($recetas as $r) {
                $ingId  = isset($r['ingrediente_id'])         && $r['ingrediente_id']         !== null ? (int) $r['ingrediente_id']         : null;
                $compId = isset($r['componente_producto_id']) && $r['componente_producto_id'] !== null ? (int) $r['componente_producto_id'] : null;

                if ($ingId !== null) {
                    $byIngrediente[$ingId] = (float) $r['cantidad'];
                } elseif ($compId !== null) {
                    $byComponente[$compId] = (float) $r['cantidad'];
                }
            }

            foreach ($byIngrediente as $ingId => $cantidad) {
                Receta::create([
                    'producto_id'    => $producto->id,
                    'ingrediente_id' => $ingId,
                    'cantidad'       => $cantidad,
                ]);
            }
            foreach ($byComponente as $compId => $cantidad) {
                Receta::create([
                    'producto_id'            => $producto->id,
                    'componente_producto_id' => $compId,
                    'cantidad'               => $cantidad,
                ]);
            }
        });

        $fresh = Receta::where('producto_id', $producto->id)
            ->with(['ingrediente', 'componente'])
            ->get();

        return RecetaResource::collection($fresh);
    }

    /**
     * @OA\Delete(
     *     path="/recetas/{receta}",
     *     tags={"Recetas"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="receta", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Receta $receta): JsonResponse
    {
        $this->authorize('delete', $receta);
        $receta->delete();
        return response()->json(null, 204);
    }
}
