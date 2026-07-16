<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Piso;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * CRUD de pisos del local autenticado. F102 — operación de salón.
 */
class PisoController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Piso::class);

        return JsonResource::collection(
            Piso::query()->withCount('mesas')->orderBy('orden')->get()
        );
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', Piso::class);
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:60'],
            'orden' => ['nullable', 'integer', 'min:0'],
        ]);
        $piso = Piso::create($data);

        return response()->json(['data' => $piso], 201);
    }

    public function update(Request $req, Piso $piso): JsonResponse
    {
        $this->authorize('update', $piso);
        $data = $req->validate([
            'nombre' => ['sometimes', 'string', 'max:60'],
            'orden' => ['nullable', 'integer', 'min:0'],
        ]);
        $piso->update($data);

        return response()->json(['data' => $piso->fresh()]);
    }

    public function destroy(Piso $piso): JsonResponse
    {
        $this->authorize('delete', $piso);
        $piso->delete();

        return response()->json(null, 204);
    }
}
