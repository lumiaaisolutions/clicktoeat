<?php

namespace App\Services\Notifications;

use App\Mail\ResumenSemanalMail;
use App\Models\Local;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Manda el resumen semanal a todos los owners con plan activo / pago externo.
 * Corre 1x a la semana desde el scheduler (domingo 20:00).
 */
class ResumenSemanalDispatcher
{
    public static function dispatchAll(): int
    {
        $sent = 0;
        $inicio  = now()->startOfWeek()->subWeek();  // semana pasada (lun→dom)
        $finPrev = $inicio->copy()->endOfWeek();
        $inicioActual = $finPrev->copy()->addSecond();
        $finActual    = now()->endOfWeek();

        $locales = Local::query()
            ->withoutGlobalScopes()
            ->whereNotNull('owner_id')
            ->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->whereIn('plan_status', ['active', 'trialing']);
                })->orWhere('pago_externo', true);
            })
            ->get();

        foreach ($locales as $local) {
            try {
                $owner = User::find($local->owner_id);
                if (! $owner?->email) continue;

                $pedidosActual = DB::table('pedidos')
                    ->where('local_id', $local->id)
                    ->whereBetween('created_at', [$inicioActual, $finActual])
                    ->where('estado', '!=', 'cancelado');

                $ventas = (float) (clone $pedidosActual)->sum('total');
                $count  = (int)   (clone $pedidosActual)->count();
                $ticket = $count > 0 ? $ventas / $count : 0;

                $countPrev = DB::table('pedidos')
                    ->where('local_id', $local->id)
                    ->whereBetween('created_at', [$inicio, $finPrev])
                    ->where('estado', '!=', 'cancelado')
                    ->count();
                $ventasPrev = (float) DB::table('pedidos')
                    ->where('local_id', $local->id)
                    ->whereBetween('created_at', [$inicio, $finPrev])
                    ->where('estado', '!=', 'cancelado')
                    ->sum('total');

                $top = DB::table('detalle_pedidos as d')
                    ->join('pedidos as p', 'p.id', '=', 'd.pedido_id')
                    ->where('p.local_id', $local->id)
                    ->whereBetween('p.created_at', [$inicioActual, $finActual])
                    ->where('p.estado', '!=', 'cancelado')
                    ->select('d.producto_nombre as nombre', DB::raw('SUM(d.cantidad) as unidades'))
                    ->groupBy('d.producto_nombre')
                    ->orderByDesc('unidades')
                    ->limit(3)
                    ->get()
                    ->map(fn ($r) => ['nombre' => $r->nombre, 'unidades' => (int) $r->unidades])
                    ->all();

                if ($count === 0 && $countPrev === 0) continue; // no spam a locales muertos

                Mail::to($owner->email)->send(new ResumenSemanalMail($local, [
                    'pedidos'      => $count,
                    'ventas'       => $ventas,
                    'ticket'       => $ticket,
                    'pedidos_prev' => $countPrev,
                    'ventas_prev'  => $ventasPrev,
                    'top'          => $top,
                ]));
                $sent++;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $sent;
    }
}
