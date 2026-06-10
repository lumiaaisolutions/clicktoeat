<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificacionResource;
use App\Http\Resources\PedidoResource;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Scopes\TenantScope;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Notificacion::query();

        if ($request->boolean('solo_no_leidas')) {
            $query->noLeidas();
        }

        $notificaciones = $query->orderByDesc('created_at')->limit(100)->get();
        $noLeidas = Notificacion::query()->noLeidas()->count();

        $tenantCtx = app(TenantContext::class);

        $pedidosQuery = Pedido::query()
            ->withoutGlobalScope(TenantScope::class)
            ->whereIn('estado', ['nuevo', 'confirmado', 'en_preparacion', 'listo'])
            ->with('detalles')
            ->orderByDesc('created_at');

        if ($tenantCtx->has()) {
            $pedidosQuery->where('local_id', $tenantCtx->id());
        } elseif ($request->user()?->local_id) {
            $pedidosQuery->where('local_id', $request->user()->local_id);
        }

        return response()->json([
            'data'            => NotificacionResource::collection($notificaciones),
            'no_leidas'       => $noLeidas,
            'pedidos_activos' => PedidoResource::collection($pedidosQuery->get()),
        ]);
    }

    public function leer(Notificacion $notificacion): NotificacionResource
    {
        $notificacion->marcarLeida();
        return new NotificacionResource($notificacion->fresh());
    }

    public function leerTodas(): JsonResponse
    {
        Notificacion::noLeidas()->update(['leida_at' => now()]);
        return response()->json(['ok' => true]);
    }
}
