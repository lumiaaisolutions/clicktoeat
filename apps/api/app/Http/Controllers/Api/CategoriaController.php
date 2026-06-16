<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Categoria\StoreCategoriaRequest;
use App\Http\Requests\Categoria\UpdateCategoriaRequest;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Tag(name="Categorías", description="CRUD de categorías del local. Tenant-scoped por middleware.")
 */
class CategoriaController extends Controller
{
    /**
     * @OA\Get(
     *     path="/categorias",
     *     tags={"Categorías"},
     *     security={{"sanctum":{}}},
     *     summary="Lista todas las categorías del local autenticado.",
     *     @OA\Parameter(name="activo", in="query", @OA\Schema(type="boolean")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Categoria::class);

        $query = Categoria::query()->withCount('productos');

        if ($request->has('activo')) {
            $query->where('activo', $request->boolean('activo'));
        }

        return CategoriaResource::collection(
            $query->orderBy('orden')->orderBy('nombre')->get()
        );
    }

    /**
     * @OA\Post(
     *     path="/categorias",
     *     tags={"Categorías"},
     *     security={{"sanctum":{}}},
     *     summary="Crea una categoría.",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"nombre"},
     *         @OA\Property(property="nombre", type="string"),
     *         @OA\Property(property="slug", type="string"),
     *         @OA\Property(property="icono", type="string"),
     *         @OA\Property(property="orden", type="integer"),
     *         @OA\Property(property="activo", type="boolean")
     *     )),
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreCategoriaRequest $request): JsonResponse
    {
        $local = app(\App\Support\TenantContext::class)->local();
        $max   = $local?->plan?->max_categorias;
        if ($max !== null) {
            $current = $local->categorias()->count();
            if ($current >= $max) {
                throw new \App\Exceptions\PlanLimitException('categorias', $max, $current);
            }
        }
        $categoria = Categoria::create($request->validated());

        return (new CategoriaResource($categoria))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/categorias/{categoria}",
     *     tags={"Categorías"},
     *     security={{"sanctum":{}}},
     *     summary="Muestra una categoría.",
     *     @OA\Parameter(name="categoria", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK"),
     *     @OA\Response(response=404, description="Not Found")
     * )
     */
    public function show(Categoria $categoria): CategoriaResource
    {
        $this->authorize('view', $categoria);
        return new CategoriaResource($categoria->loadCount('productos'));
    }

    /**
     * @OA\Patch(
     *     path="/categorias/{categoria}",
     *     tags={"Categorías"},
     *     security={{"sanctum":{}}},
     *     summary="Actualiza una categoría.",
     *     @OA\Parameter(name="categoria", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true, @OA\JsonContent()),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateCategoriaRequest $request, Categoria $categoria): CategoriaResource
    {
        $categoria->update($request->validated());
        return new CategoriaResource($categoria->fresh());
    }

    /**
     * @OA\Delete(
     *     path="/categorias/{categoria}",
     *     tags={"Categorías"},
     *     security={{"sanctum":{}}},
     *     summary="Elimina una categoría (rechaza si tiene productos).",
     *     @OA\Parameter(name="categoria", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content"),
     *     @OA\Response(response=409, description="Conflict")
     * )
     */
    public function destroy(Categoria $categoria): JsonResponse
    {
        $this->authorize('delete', $categoria);

        if ($categoria->productos()->count() > 0) {
            return response()->json([
                'message' => 'No se puede eliminar: la categoría tiene productos. Reasígnalos primero.',
            ], 409);
        }

        $categoria->delete();
        return response()->json(null, 204);
    }
}
