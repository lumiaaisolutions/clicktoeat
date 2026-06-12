<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Producto\StoreProductoRequest;
use App\Http\Requests\Producto\UpdateProductoRequest;
use App\Http\Resources\ProductoResource;
use App\Models\Producto;
use App\Services\Images\ImageUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Tag(name="Productos", description="CRUD de productos del local.")
 */
class ProductoController extends Controller
{
    public function __construct(protected ImageUploader $uploader) {}

    /**
     * @OA\Get(
     *     path="/productos",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     summary="Lista productos del local con filtros.",
     *     @OA\Parameter(name="categoria_id", in="query", @OA\Schema(type="integer")),
     *     @OA\Parameter(name="disponible", in="query", @OA\Schema(type="boolean")),
     *     @OA\Parameter(name="q", in="query", description="Búsqueda por nombre", @OA\Schema(type="string")),
     *     @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer", default=20)),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Producto::class);

        $query = Producto::query()->with('categoria:id,slug,nombre');

        // Filtro de soft-delete: trashed=only (sólo borrados) | with (incluye borrados)
        if ($request->input('trashed') === 'only') {
            $query->onlyTrashed();
        } elseif ($request->input('trashed') === 'with') {
            $query->withTrashed();
        }

        if ($request->filled('categoria_id')) {
            $query->where('categoria_id', $request->integer('categoria_id'));
        }
        if ($request->has('disponible')) {
            $query->where('disponible', $request->boolean('disponible'));
        }
        if ($request->filled('q')) {
            $term = '%'.trim($request->string('q')).'%';
            $query->where('nombre', 'like', $term);
        }

        $perPage = min((int) $request->input('per_page', 20), 100);

        return ProductoResource::collection(
            $query->orderBy('orden')->orderBy('nombre')->paginate($perPage)
        );
    }

    /**
     * @OA\Post(
     *     path="/productos/{producto}/restore",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     summary="Restaura un producto soft-deleted.",
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function restore(int $id): ProductoResource
    {
        $producto = Producto::withTrashed()->findOrFail($id);
        $this->authorize('restore', $producto);

        $producto->restore();

        return new ProductoResource($producto->fresh()->load('categoria'));
    }

    /**
     * @OA\Post(
     *     path="/productos",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     summary="Crea un producto.",
     *     @OA\RequestBody(required=true, @OA\JsonContent(
     *         required={"categoria_id","nombre","precio"},
     *         @OA\Property(property="categoria_id", type="integer"),
     *         @OA\Property(property="nombre", type="string"),
     *         @OA\Property(property="descripcion", type="string"),
     *         @OA\Property(property="precio", type="number"),
     *         @OA\Property(property="imagen_url", type="string"),
     *         @OA\Property(property="extras", type="array", @OA\Items(type="object"))
     *     )),
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = Producto::create($request->validated());

        return (new ProductoResource($producto->load('categoria')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @OA\Get(
     *     path="/productos/{producto}",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Producto $producto): ProductoResource
    {
        $this->authorize('view', $producto);
        return new ProductoResource($producto->load('categoria'));
    }

    /**
     * @OA\Patch(
     *     path="/productos/{producto}",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateProductoRequest $request, Producto $producto): ProductoResource
    {
        $previousPublicId = $producto->imagen_public_id;
        $producto->update($request->validated());

        // Si se reemplazó la imagen, intenta borrar la anterior de Cloudinary
        if (
            $previousPublicId
            && $request->has('imagen_public_id')
            && $request->input('imagen_public_id') !== $previousPublicId
        ) {
            $this->uploader->destroy($previousPublicId);
        }

        return new ProductoResource($producto->fresh()->load('categoria'));
    }

    /**
     * @OA\Delete(
     *     path="/productos/{producto}",
     *     tags={"Productos"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(name="producto", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Producto $producto): JsonResponse
    {
        $this->authorize('delete', $producto);

        if ($producto->imagen_public_id) {
            $this->uploader->destroy($producto->imagen_public_id);
        }

        $producto->delete();
        return response()->json(null, 204);
    }
}
