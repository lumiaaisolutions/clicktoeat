<?php

namespace App\Console\Commands;

use App\Models\Local;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Alerta de trials "colgados": locales que siguen en `plan_status='trialing'`
 * más de 24 h DESPUÉS de que venció su `trial_ends_at`.
 *
 * Es un detector de fallos, NO un mutador (no cambia el estado — de eso se
 * encarga `trials:expire-manual`). Que un trial siga colgado significa que:
 *   - el cron `trials:expire-manual` no corrió (nos pasó en prod cuando el
 *     scheduler estaba caído — ver postmortem 2026-07-06-trial-expiry-not-enforced
 *     y scheduler-cron-faltante.md), o
 *   - es un trial de Stripe cuyo webhook `subscription.updated` no disparó.
 *
 * Reporta a Sentry (canal vivo; el mail SMTP está caído) + Log::warning para
 * que un humano investigue. `hasActivePlan()` ya bloquea el acceso en tiempo
 * real aunque el estado esté colgado, así que esto es una red de seguridad de
 * monitoreo, no un bloqueo de negocio.
 */
class AlertStuckTrialsCommand extends Command
{
    protected $signature = 'trials:alert-stuck {--hours=24 : Horas de gracia tras el vencimiento antes de alertar}';

    protected $description = 'Alerta (Sentry+log) de trials que siguen trialing tras vencer hace >24h.';

    public function handle(): int
    {
        $graceHours = (int) $this->option('hours');
        $cutoff = now()->subHours($graceHours);

        $stuck = Local::query()
            ->withoutGlobalScopes()
            ->where('plan_status', 'trialing')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', $cutoff)
            ->where(fn ($q) => $q->where('pago_externo', false)->orWhereNull('pago_externo'))
            ->get(['id', 'slug', 'plan_status', 'trial_ends_at', 'stripe_subscription_id']);

        if ($stuck->isEmpty()) {
            $this->info('Sin trials colgados.');

            return self::SUCCESS;
        }

        $payload = $stuck->map(fn (Local $l) => [
            'local_id' => $l->id,
            'slug' => $l->slug,
            'trial_ends_at' => $l->trial_ends_at?->toIso8601String(),
            'horas_vencido' => (int) $l->trial_ends_at?->diffInHours(now()),
            'tiene_stripe_sub' => $l->stripe_subscription_id !== null,
        ])->all();

        Log::warning('Trials colgados detectados (trialing tras vencer >'.$graceHours.'h)', [
            'total' => $stuck->count(),
            'locales' => $payload,
        ]);

        if (function_exists('\Sentry\captureMessage')) {
            \Sentry\captureMessage(
                "⚠️ {$stuck->count()} trial(es) colgado(s): trialing tras vencer >{$graceHours}h. ".
                'Revisar scheduler (trials:expire-manual) y webhooks de Stripe. '.
                'Locales: '.$stuck->pluck('slug')->implode(', '),
                \Sentry\Severity::warning()
            );
        }

        $this->warn("{$stuck->count()} trials colgados. Reportado a Sentry + log.");

        return self::SUCCESS;
    }
}
