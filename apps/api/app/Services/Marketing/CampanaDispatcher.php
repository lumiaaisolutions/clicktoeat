<?php

namespace App\Services\Marketing;

use App\Mail\CampanaMail;
use App\Models\Campana;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

/**
 * Envío real de campañas. v1: sólo `tipo=email` — el segmento 'todos' es
 * el conjunto de `cliente_email` distintos en los pedidos del local.
 *
 * `tipo=push` a CLIENTES FINALES no está soportado todavía: el sistema de
 * push existente (`PushDispatcher`) notifica a DISPOSITIVOS DE STAFF (owner/
 * empleados), no hay registro de suscripciones push de clientes finales.
 * Construir eso es una feature aparte (requiere que el cliente se suscriba
 * desde la landing pública), fuera de alcance de este dispatcher.
 */
class CampanaDispatcher
{
    public function enviar(Campana $campana): Campana
    {
        if ($campana->enviada_at !== null) {
            throw new RuntimeException('Esta campaña ya fue enviada.');
        }

        if ($campana->tipo === 'push') {
            throw new RuntimeException(
                'Push a clientes finales no está soportado todavía (no existe registro de suscripción push de clientes) — usa tipo=email.'
            );
        }

        $emails = DB::table('pedidos')
            ->where('local_id', $campana->local_id)
            ->whereNotNull('cliente_email')
            ->distinct()
            ->pluck('cliente_email');

        $enviados = 0;
        foreach ($emails as $email) {
            try {
                Mail::to($email)->send(new CampanaMail($campana));
                $enviados++;
            } catch (\Throwable $e) {
                report($e); // un email inválido/rebote no debe abortar el resto del envío
            }
        }

        $campana->update([
            'enviada_at' => now(),
            'destinatarios_count' => $enviados,
        ]);

        return $campana->fresh();
    }
}
