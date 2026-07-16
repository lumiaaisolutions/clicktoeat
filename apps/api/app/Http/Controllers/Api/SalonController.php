<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PedidoResource;
use App\Models\LlamadoMesero;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Pantallas operativas de salón (cocina/mesero). Reutiliza el mismo
 * `PATCH pedidos/{pedido}/estado` existente para las transiciones — esta
 * clase sólo filtra qué ve cada zona. Ver ADR-012 y plan de implementación.
 */
class SalonController extends Controller
{
    /** Pedidos de mesa en preparación (cocina). */
    public function pedidosCocina(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Pedido::class);

        $q = Pedido::query()
            ->with(['detalles', 'mesa'])
            ->whereNotNull('mesa_id')
            ->whereIn('estado', ['nuevo', 'confirmado', 'preparando'])
            ->orderBy('created_at');

        return PedidoResource::collection($q->get());
    }

    /** Pedidos de mesa listos para entregar (mesero). */
    public function pedidosMesero(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Pedido::class);

        $q = Pedido::query()
            ->with(['detalles', 'mesa'])
            ->whereNotNull('mesa_id')
            ->where('estado', 'listo')
            ->orderBy('created_at');

        return PedidoResource::collection($q->get());
    }

    /** Llamados de mesero pendientes de atender. */
    public function llamadosPendientes(): JsonResponse
    {
        $this->authorize('viewAny', LlamadoMesero::class);

        $llamados = LlamadoMesero::query()
            ->with('mesa')
            ->whereNull('atendido_at')
            ->orderBy('created_at')
            ->get()
            ->map(fn (LlamadoMesero $l) => [
                'id' => $l->id,
                'mesa' => $l->mesa?->etiqueta,
                'mesa_id' => $l->mesa_id,
                'created_at' => $l->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $llamados]);
    }

    public function atenderLlamado(LlamadoMesero $llamado): JsonResponse
    {
        $this->authorize('atender', $llamado);

        if (! $llamado->atendido_at) {
            $llamado->update([
                'atendido_at' => now(),
                'atendido_por' => request()->user()->id,
            ]);
        }

        return response()->json(['data' => $llamado->fresh()]);
    }
}
