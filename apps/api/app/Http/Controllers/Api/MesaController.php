<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mesa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Validation\Rule;

/**
 * CRUD de mesas + mapa de piso (posición x/y en grid simple, v1 — sin
 * canvas drag&drop libre todavía, ver plan-499-operacion-salon-implementacion.md).
 */
class MesaController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Mesa::class);
        $q = Mesa::query()->with('piso')->orderBy('piso_id')->orderBy('etiqueta');
        if ($req->filled('piso_id')) {
            $q->where('piso_id', $req->integer('piso_id'));
        }

        return JsonResource::collection($q->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', Mesa::class);
        $data = $req->validate([
            'piso_id' => ['nullable', 'integer', Rule::exists('pisos', 'id')->where('local_id', $req->user()->local_id)],
            'etiqueta' => ['required', 'string', 'max:40'],
            'pos_x' => ['nullable', 'integer', 'min:0'],
            'pos_y' => ['nullable', 'integer', 'min:0'],
        ]);
        $mesa = Mesa::create($data);

        return response()->json(['data' => $mesa], 201);
    }

    public function update(Request $req, Mesa $mesa): JsonResponse
    {
        $this->authorize('update', $mesa);
        $data = $req->validate([
            'piso_id' => ['nullable', 'integer', Rule::exists('pisos', 'id')->where('local_id', $mesa->local_id)],
            'etiqueta' => ['sometimes', 'string', 'max:40'],
            'pos_x' => ['nullable', 'integer', 'min:0'],
            'pos_y' => ['nullable', 'integer', 'min:0'],
            'estado' => ['sometimes', 'in:libre,ocupada,por_cobrar'],
        ]);
        $mesa->update($data);

        return response()->json(['data' => $mesa->fresh()]);
    }

    public function destroy(Mesa $mesa): JsonResponse
    {
        $this->authorize('delete', $mesa);
        $mesa->delete();

        return response()->json(null, 204);
    }
}
