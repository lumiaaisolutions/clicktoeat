<?php

namespace App\Services\Notifications;

use App\Mail\CarritoAbandonadoMail;
use App\Models\Local;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Despacha emails de recuperación de carrito abandonado. Corre cada 15min
 * desde el scheduler. Reglas:
 *   - El carrito lleva > 60min sin actividad.
 *   - No se envió ya un email para este registro (notified_at IS NULL).
 *   - No se recuperó (recovered_at IS NULL).
 *   - El local tiene plan activo o pago_externo.
 *   - El email no aparece en pedidos del local en las últimas 2 horas
 *     (proxy: el cliente quizás ya hizo pedido y aún no marcamos recovered).
 */
class CarritoAbandonadoDispatcher
{
    public static function dispatchPending(): int
    {
        $sent = 0;
        $cutoff = now()->subMinutes(60);

        $carritos = DB::table('carritos_abandonados')
            ->whereNull('notified_at')
            ->whereNull('recovered_at')
            ->where('seen_at', '<=', $cutoff)
            ->where('seen_at', '>=', now()->subHours(24)) // no spamear cosas muy viejas
            ->limit(200)
            ->get();

        foreach ($carritos as $row) {
            $local = Local::find($row->local_id);
            if (! $local) continue;
            if (! $local->hasActivePlan()) continue;

            // Doble-check: ¿el email ya hizo pedido en este local en las últimas 2h?
            $hizoPedido = DB::table('pedidos')
                ->where('local_id', $row->local_id)
                ->whereRaw('LOWER(cliente_email) = ?', [$row->email])
                ->where('created_at', '>=', now()->subHours(2))
                ->exists();

            if ($hizoPedido) {
                DB::table('carritos_abandonados')->where('id', $row->id)
                    ->update(['recovered_at' => now()]);
                continue;
            }

            $items = json_decode($row->items, true) ?? [];
            try {
                Mail::to($row->email)->send(new CarritoAbandonadoMail(
                    $local,
                    (string) ($row->cliente_nombre ?? ''),
                    $items,
                    (float) $row->total_estimado,
                ));
                DB::table('carritos_abandonados')->where('id', $row->id)
                    ->update(['notified_at' => now()]);
                $sent++;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $sent;
    }
}
