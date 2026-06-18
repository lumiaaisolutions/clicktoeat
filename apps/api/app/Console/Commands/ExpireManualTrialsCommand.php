<?php

namespace App\Console\Commands;

use App\Models\Local;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * F100g — Expira los trials MANUALES vencidos.
 *
 * Un local en trial creado por Stripe checkout se actualiza automáticamente
 * vía webhook (`subscription.updated` con status=incomplete o past_due
 * cuando termina el trial sin tarjeta). Pero los trials marcados a mano
 * por el super_admin desde el panel NO tienen subscription en Stripe →
 * nadie nunca cambia su `plan_status` → quedaría "trialing" para siempre.
 *
 * Este comando cierra ese hueco. Diario:
 *   - Busca locales `trialing` + `trial_ends_at < now` + sin stripe_subscription
 *   - Los pasa a `plan_status = 'incomplete'`
 *   - Sin tarjeta = sin acceso. El frontend PlanInactiveScreen los bloquea.
 *
 * Usuario verá la pantalla bloqueante con CTA para activar suscripción
 * vía `/billing/activate-existing` (Checkout vinculado al local).
 *
 * Idempotente — locales ya marcados como incomplete no se vuelven a tocar.
 */
class ExpireManualTrialsCommand extends Command
{
    protected $signature   = 'trials:expire-manual';
    protected $description = 'Marca como incomplete los trials manuales vencidos sin Stripe subscription.';

    public function handle(): int
    {
        $locales = Local::query()
            ->withoutGlobalScopes()
            ->where('plan_status', 'trialing')
            ->where('trial_ends_at', '<', now())
            ->whereNull('stripe_subscription_id')
            // Excluimos pago_externo: esos pagan en efectivo/transferencia y
            // el super_admin los mantiene activos sin Stripe a propósito.
            ->where(fn ($q) => $q->where('pago_externo', false)->orWhereNull('pago_externo'))
            ->get();

        $count = 0;
        foreach ($locales as $local) {
            $local->forceFill([
                'plan_status' => 'incomplete',
            ])->save();

            Log::info('Trial manual expirado', [
                'local_id'      => $local->id,
                'local_slug'    => $local->slug,
                'trial_ends_at' => $local->trial_ends_at?->toIso8601String(),
                'expired_at'    => now()->toIso8601String(),
            ]);

            $count++;
        }

        $this->info("Expiraron {$count} trials manuales.");
        return self::SUCCESS;
    }
}
