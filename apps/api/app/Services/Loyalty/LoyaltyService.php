<?php

namespace App\Services\Loyalty;

use App\Models\Local;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;

/**
 * Programa de lealtad por sellos. Cada pedido vinculado a un email
 * suma 1 sello. Al llegar a `lealtad_meta` se considera ganado un premio
 * (el local lo entrega al cliente — la app no descuenta automáticamente).
 *
 * - Idempotente: si se llama dos veces con el mismo pedido, no duplica.
 * - No-op si el local no tiene `lealtad_activo` o el pedido no tiene email.
 */
class LoyaltyService
{
    /**
     * Suma 1 sello al cliente. Devuelve true si con este pedido completó
     * el ciclo de premios (el owner debe regalarle algo en la siguiente).
     */
    public function registrarPedido(Pedido $pedido): bool
    {
        $local = $pedido->local ?? Local::find($pedido->local_id);
        if (! $local || ! $local->lealtad_activo) return false;
        if (empty($pedido->cliente_email))     return false;

        $email = strtolower(trim($pedido->cliente_email));
        $meta  = max(1, (int) $local->lealtad_meta);

        return DB::transaction(function () use ($local, $pedido, $email, $meta) {
            $row = DB::table('lealtad_sellos')
                ->where('local_id', $local->id)
                ->where('cliente_email', $email)
                ->lockForUpdate()
                ->first();

            $nuevoCount = ($row?->count ?? 0) + 1;
            $premioListo = ($nuevoCount % $meta) === 0;

            if ($row) {
                DB::table('lealtad_sellos')
                    ->where('id', $row->id)
                    ->update([
                        'count'          => $nuevoCount,
                        'cliente_nombre' => $pedido->cliente_nombre ?? $row->cliente_nombre,
                        'last_pedido_at' => now(),
                        'updated_at'     => now(),
                    ]);
            } else {
                DB::table('lealtad_sellos')->insert([
                    'local_id'       => $local->id,
                    'cliente_email'  => $email,
                    'cliente_nombre' => $pedido->cliente_nombre,
                    'count'          => $nuevoCount,
                    'last_pedido_at' => now(),
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            return $premioListo;
        });
    }

    /** Estado para mostrar al cliente final en la landing. */
    public function statusPara(Local $local, string $email): ?array
    {
        if (! $local->lealtad_activo) return null;
        $email = strtolower(trim($email));
        $row = DB::table('lealtad_sellos')
            ->where('local_id', $local->id)
            ->where('cliente_email', $email)
            ->first();

        $count = (int) ($row->count ?? 0);
        $meta  = max(1, (int) $local->lealtad_meta);
        $current = $count % $meta; // si ya redimió, el nuevo ciclo arranca en N+1

        return [
            'count'        => $count,
            'current'      => $current,
            'meta'         => $meta,
            'premio'       => $local->lealtad_premio,
            'premios_ganados' => intdiv($count, $meta),
        ];
    }
}
