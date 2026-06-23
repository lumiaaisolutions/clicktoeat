<?php

namespace App\Console\Commands;

use App\Models\Gasto;
use App\Models\Notificacion;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Recorre todos los gastos marcados como `recurrente = true` y, si su
 * registro más reciente lleva > THRESHOLD_DAYS días, crea una notificación
 * para el owner: "te falta registrar la renta de junio".
 *
 * Idempotente: si ya existe una notif tipo `gasto_recurrente_pendiente`
 * para el mismo local + concepto en los últimos 7 días, no la duplica.
 *
 * Ejecuta diario via schedule (`schedule:run` + cron de hPanel).
 */
class CheckGastosRecurrentesCommand extends Command
{
    protected $signature   = 'gastos:check-recurrentes';
    protected $description = 'Notifica a los owners cuando un gasto recurrente lleva >35 días sin nuevo registro.';

    private const THRESHOLD_DAYS = 35;

    public function handle(): int
    {
        $cutoff = now()->subDays(self::THRESHOLD_DAYS);
        $notifWindow = now()->subDays(7);

        // Sub-query: último gasto recurrente por (local_id, categoria, concepto).
        // Usamos DB::table para saltar el TenantScope (super-cron sin contexto).
        $rows = DB::table('gastos')
            ->whereNull('deleted_at')
            ->where('recurrente', true)
            ->select('local_id', 'categoria', 'concepto', DB::raw('MAX(fecha) as ultimo'))
            ->groupBy('local_id', 'categoria', 'concepto')
            ->get();

        $creadas = 0;

        foreach ($rows as $r) {
            $ultimo = Carbon::parse($r->ultimo);
            if ($ultimo->gt($cutoff)) {
                continue; // todavía dentro del rango aceptable
            }

            $dias = (int) $ultimo->diffInDays(now());

            // Idempotencia: misma notif (titulo único por concepto) en los últimos 7 días → skip.
            $tituloEsperado = "Gasto pendiente: {$r->concepto}";
            $yaExiste = DB::table('notificaciones')
                ->where('local_id', $r->local_id)
                ->where('tipo', 'gasto_recurrente_pendiente')
                ->where('titulo', $tituloEsperado)
                ->where('created_at', '>=', $notifWindow)
                ->exists();

            if ($yaExiste) {
                continue;
            }

            Notificacion::create([
                'local_id' => $r->local_id,
                'tipo'     => 'gasto_recurrente_pendiente',
                'titulo'   => "Gasto pendiente: {$r->concepto}",
                'mensaje'  => "Llevas {$dias} días sin registrar {$r->concepto} ({$r->categoria}). ¿Ya pagaste este mes?",
                'data'     => [
                    'categoria'   => $r->categoria,
                    'concepto'    => $r->concepto,
                    'ultimo'      => $ultimo->toDateString(),
                    'dias'        => $dias,
                    'url_destino' => '/admin/gastos',
                ],
            ]);

            $creadas++;
        }

        $this->info("Notificaciones creadas: {$creadas}");
        return Command::SUCCESS;
    }
}
