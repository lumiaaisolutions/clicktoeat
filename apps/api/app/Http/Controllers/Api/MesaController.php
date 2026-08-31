<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MesaResource;
use App\Models\CuentaMesa;
use App\Models\Mesa;
use App\Models\MesaEvento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * CRUD de mesas + mapa de piso (posición x/y) + control de mesa (quién atiende).
 * Ver docs/features/salon-roadmap.md (Fase A) y plan-499-operacion-salon-implementacion.md.
 */
class MesaController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Mesa::class);
        $q = Mesa::query()->with(['piso', 'mesero'])->orderBy('piso_id')->orderBy('etiqueta');
        if ($req->filled('piso_id')) {
            $q->where('piso_id', $req->integer('piso_id'));
        }

        return MesaResource::collection($q->get());
    }

    public function show(Mesa $mesa): JsonResponse
    {
        $this->authorize('view', $mesa);
        $mesa->load('mesero');

        $cuenta = CuentaMesa::query()
            ->where('mesa_id', $mesa->id)
            ->whereIn('estado', ['abierta', 'pre_cuenta'])
            ->with(['pedidos.detalles'])
            ->latest('id')
            ->first();

        $eventos = MesaEvento::query()
            ->where('mesa_id', $mesa->id)
            ->with('usuario:id,nombre')
            ->latest('id')
            ->limit(40)
            ->get()
            ->map(fn (MesaEvento $e) => [
                'id' => $e->id,
                'tipo' => $e->tipo,
                'estado_anterior' => $e->estado_anterior,
                'estado_nuevo' => $e->estado_nuevo,
                'usuario' => $e->usuario?->nombre,
                'meta' => $e->meta,
                'created_at' => $e->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => array_merge(
                (new MesaResource($mesa))->resolve(),
                ['cuenta' => $cuenta, 'eventos' => $eventos],
            ),
        ]);
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

        return response()->json(['data' => new MesaResource($mesa)], 201);
    }

    public function update(Request $req, Mesa $mesa): JsonResponse
    {
        $this->authorize('update', $mesa);
        $data = $req->validate([
            'piso_id' => ['nullable', 'integer', Rule::exists('pisos', 'id')->where('local_id', $mesa->local_id)],
            'etiqueta' => ['sometimes', 'string', 'max:40'],
            'pos_x' => ['nullable', 'integer', 'min:0'],
            'pos_y' => ['nullable', 'integer', 'min:0'],
            'estado' => ['sometimes', 'in:libre,ocupada,por_cobrar,reservada,limpieza'],
        ]);
        $estadoAnterior = $mesa->estado;
        $mesa->update($data);

        if (array_key_exists('estado', $data) && $data['estado'] !== $estadoAnterior) {
            MesaEvento::registrar($mesa, 'estado_cambio', [
                'estado_anterior' => $estadoAnterior,
                'estado_nuevo' => $data['estado'],
            ]);
        }

        return response()->json(['data' => new MesaResource($mesa->fresh('mesero'))]);
    }

    /**
     * El mesero (o el dueño) toma control de la mesa. Exclusivo: si ya la
     * atiende otro, solo el dueño puede reasignarla (409 para el resto).
     */
    public function tomar(Request $req, Mesa $mesa): JsonResponse
    {
        $this->authorize('tomar', $mesa);
        $user = $req->user();

        if ($mesa->atendido_por && $mesa->atendido_por !== $user->id && ! $user->isOwner()) {
            return response()->json([
                'message' => 'La mesa ya está siendo atendida por otro mesero.',
                'atiende' => $mesa->mesero?->nombre,
            ], 409);
        }

        $mesa->update(['atendido_por' => $user->id, 'atendido_desde' => now()]);
        MesaEvento::registrar($mesa, 'tomada', ['meta' => ['mesero' => $user->nombre]]);

        return response()->json(['data' => new MesaResource($mesa->fresh('mesero'))]);
    }

    /** Libera la mesa (la deja sin mesero asignado). */
    public function liberar(Mesa $mesa): JsonResponse
    {
        $this->authorize('liberar', $mesa);
        $meseroPrevio = $mesa->mesero?->nombre;
        $mesa->update(['atendido_por' => null, 'atendido_desde' => null]);
        MesaEvento::registrar($mesa, 'liberada', ['meta' => ['mesero' => $meseroPrevio]]);

        return response()->json(['data' => new MesaResource($mesa->fresh('mesero'))]);
    }

    public function destroy(Mesa $mesa): JsonResponse
    {
        $this->authorize('delete', $mesa);
        $mesa->delete();

        return response()->json(null, 204);
    }
}
