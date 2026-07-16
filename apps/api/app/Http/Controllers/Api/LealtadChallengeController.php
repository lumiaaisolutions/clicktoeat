<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LealtadChallenge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class LealtadChallengeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', LealtadChallenge::class);

        return JsonResource::collection(LealtadChallenge::query()->orderByDesc('activo')->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', LealtadChallenge::class);
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:60'],
            'criterio' => ['required', 'array'],
            'premio' => ['required', 'string', 'max:200'],
            'activo' => ['boolean'],
        ]);
        $challenge = LealtadChallenge::create($data);

        return response()->json(['data' => $challenge], 201);
    }

    public function update(Request $req, LealtadChallenge $lealtadChallenge): JsonResponse
    {
        $this->authorize('update', $lealtadChallenge);
        $data = $req->validate([
            'nombre' => ['sometimes', 'string', 'max:60'],
            'criterio' => ['sometimes', 'array'],
            'premio' => ['sometimes', 'string', 'max:200'],
            'activo' => ['boolean'],
        ]);
        $lealtadChallenge->update($data);

        return response()->json(['data' => $lealtadChallenge->fresh()]);
    }

    public function destroy(LealtadChallenge $lealtadChallenge): JsonResponse
    {
        $this->authorize('delete', $lealtadChallenge);
        $lealtadChallenge->delete();

        return response()->json(null, 204);
    }
}
