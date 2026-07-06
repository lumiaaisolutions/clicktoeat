<?php

namespace App\Console\Commands;

use App\Models\Local;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Red de seguridad post-incidente 2026-07-06 (ver
 * docs/runbook/postmortems/2026-07-06-locales-huerfanos-stripe.md).
 *
 * Un local con `stripe_subscription_id` real pero sin `owner_id` es siempre
 * anómalo: significa que el checkout de Stripe completó (hay cobro/trial en
 * curso) pero el wizard de onboarding nunca terminó de vincular un dueño —
 * el mismo patrón que produjo 3 locales huérfanos duplicados. Detectarlo
 * temprano evita que lleguen a su primer cobro sin que nadie los reclame.
 *
 * Reporta via Log::critical (siempre) + report() (Sentry, si DSN configurado).
 * No es idempotente por diseño — si el hueco no se resuelve, debe seguir
 * alertando cada corrida hasta que se vincule o se cancele manualmente.
 */
class DetectOrphanStripeLocalsCommand extends Command
{
    protected $signature   = 'locales:detect-orphan-stripe';
    protected $description = 'Alerta sobre locales con suscripción Stripe activa pero sin owner_id vinculado.';

    public function handle(): int
    {
        $orphans = Local::query()
            ->withoutGlobalScopes()
            ->whereNull('owner_id')
            ->whereNotNull('stripe_subscription_id')
            ->get(['id', 'nombre', 'slug', 'stripe_customer_id', 'stripe_subscription_id', 'plan_status', 'trial_ends_at', 'created_at']);

        if ($orphans->isEmpty()) {
            $this->info('Sin locales huérfanos con Stripe activo.');
            return self::SUCCESS;
        }

        $detalle = $orphans->map(fn (Local $l) => [
            'id'                     => $l->id,
            'nombre'                 => $l->nombre,
            'slug'                   => $l->slug,
            'stripe_customer_id'     => $l->stripe_customer_id,
            'stripe_subscription_id' => $l->stripe_subscription_id,
            'plan_status'            => $l->plan_status,
            'trial_ends_at'          => $l->trial_ends_at?->toIso8601String(),
            'created_at'             => $l->created_at?->toIso8601String(),
        ])->all();

        Log::critical('Locales con Stripe activo sin owner_id (huérfanos)', ['locales' => $detalle]);

        report(new RuntimeException(
            'Locales huérfanos con Stripe activo detectados: '.$orphans->pluck('id')->implode(', ')
        ));

        $this->error("Detectados {$orphans->count()} locales huérfanos con Stripe activo — ver logs.");
        foreach ($detalle as $d) {
            $this->line("  - local #{$d['id']} \"{$d['nombre']}\" ({$d['slug']}) — sub {$d['stripe_subscription_id']}");
        }

        return self::FAILURE;
    }
}
