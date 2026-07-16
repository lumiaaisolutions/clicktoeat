<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LealtadTier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class LealtadTierController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', LealtadTier::class);

        return JsonResource::collection(LealtadTier::query()->orderBy('sellos_requeridos')->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', LealtadTier::class);
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:60'],
            'sellos_requeridos' => ['required', 'integer', 'min:1'],
            'beneficio' => ['required', 'string', 'max:200'],
        ]);
        $tier = LealtadTier::create($data);

        return response()->json(['data' => $tier], 201);
    }

    public function update(Request $req, LealtadTier $lealtadTier): JsonResponse
    {
        $this->authorize('update', $lealtadTier);
        $data = $req->validate([
            'nombre' => ['sometimes', 'string', 'max:60'],
            'sellos_requeridos' => ['sometimes', 'integer', 'min:1'],
            'beneficio' => ['sometimes', 'string', 'max:200'],
        ]);
        $lealtadTier->update($data);

        return response()->json(['data' => $lealtadTier->fresh()]);
    }

    public function destroy(LealtadTier $lealtadTier): JsonResponse
    {
        $this->authorize('delete', $lealtadTier);
        $lealtadTier->delete();

        return response()->json(null, 204);
    }
}
