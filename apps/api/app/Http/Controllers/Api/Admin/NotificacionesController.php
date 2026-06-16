<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Feed unificado de notificaciones para el super_admin. Agrega eventos
 * relevantes que típicamente requieren su atención. Sin DB persistente —
 * se calcula on-demand y se sirve crudo. Si en el futuro hay > 100 eventos
 * activos a la vez, se puede materializar en una tabla `super_notifications`.
 */
class NotificacionesController extends Controller
{
    public function index(): JsonResponse
    {
        $items = collect();

        // Tickets abiertos
        SupportTicket::query()
            ->whereIn('estado', ['abierto'])
            ->with('user:id,nombre', 'local:id,nombre')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->each(function (SupportTicket $t) use ($items) {
                $items->push([
                    'id'         => "ticket-{$t->id}",
                    'tipo'       => 'ticket',
                    'titulo'     => "Ticket abierto: {$t->asunto}",
                    'mensaje'    => ($t->user?->nombre ?? 'Owner').' · '.($t->local?->nombre ?? 'sin local'),
                    'url'        => '/admin/tickets',
                    'created_at' => $t->created_at?->toIso8601String(),
                    'severity'   => $t->prioridad === 'alta' || $t->prioridad === 'urgente' ? 'danger' : 'info',
                ]);
            });

        // Locales registrados en los últimos 7 días
        Local::query()
            ->withoutGlobalScopes()
            ->where('created_at', '>=', now()->subDays(7))
            ->orderByDesc('id')
            ->limit(20)
            ->get(['id', 'nombre', 'slug', 'created_at'])
            ->each(function (Local $l) use ($items) {
                $items->push([
                    'id'         => "local-{$l->id}",
                    'tipo'       => 'nuevo_local',
                    'titulo'     => "Nuevo local: {$l->nombre}",
                    'mensaje'    => "Acaba de registrarse en la plataforma",
                    'url'        => "/admin/locales/{$l->id}",
                    'created_at' => $l->created_at?->toIso8601String(),
                    'severity'   => 'success',
                ]);
            });

        // Pagos fallidos en los últimos 30 días (locales con plan_status payment_failed)
        Local::query()
            ->withoutGlobalScopes()
            ->where('plan_status', 'past_due')
            ->orWhere('plan_status', 'payment_failed')
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['id', 'nombre', 'updated_at', 'plan_status'])
            ->each(function (Local $l) use ($items) {
                $items->push([
                    'id'         => "pago-{$l->id}",
                    'tipo'       => 'pago_fallido',
                    'titulo'     => "Pago fallido: {$l->nombre}",
                    'mensaje'    => "Estado: {$l->plan_status}",
                    'url'        => "/admin/locales/{$l->id}",
                    'created_at' => $l->updated_at?->toIso8601String(),
                    'severity'   => 'warning',
                ]);
            });

        $sorted = $items->sortByDesc('created_at')->values();

        return response()->json(['data' => $sorted, 'total' => $sorted->count()]);
    }
}
