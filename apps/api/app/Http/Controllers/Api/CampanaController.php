<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Campana;
use App\Services\Marketing\CampanaDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * CRUD + envío real (v1: sólo email). Ver `CampanaDispatcher`.
 */
class CampanaController extends Controller
{
    public function __construct(protected CampanaDispatcher $dispatcher) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Campana::class);

        return JsonResource::collection(Campana::query()->orderByDesc('created_at')->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', Campana::class);
        $data = $req->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'tipo' => ['required', 'in:email,push'],
            'asunto' => ['nullable', 'string', 'max:150'],
            'mensaje' => ['required', 'string', 'max:5000'],
            'segmento' => ['nullable', 'in:todos'],
            'programada_para' => ['nullable', 'date'],
        ]);
        $campana = Campana::create($data + ['segmento' => $data['segmento'] ?? 'todos']);

        return response()->json(['data' => $campana], 201);
    }

    public function enviar(Campana $campana): JsonResponse
    {
        $this->authorize('update', $campana);

        try {
            $campana = $this->dispatcher->enviar($campana);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['data' => $campana]);
    }
}
