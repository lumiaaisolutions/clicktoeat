<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Red de seguridad post-incidente 2026-07-06: un local con
 * stripe_subscription_id real pero sin owner_id es siempre anómalo.
 * Exit code 1 = detectó huérfanos (para que el cron lo marque como fallido
 * y quede visible en el histórico de "Trabajos Cron" de hPanel).
 */
class DetectOrphanStripeLocalsTest extends TestCase
{
    use RefreshDatabase;

    public function test_detecta_local_huerfano_con_stripe_activo(): void
    {
        Local::factory()->create([
            'owner_id' => null,
            'stripe_subscription_id' => 'sub_huerfano',
            'plan_status' => 'trialing',
        ]);

        $this->artisan('locales:detect-orphan-stripe')->assertExitCode(1);
    }

    public function test_no_alerta_si_el_local_tiene_owner(): void
    {
        $owner = User::factory()->create(['rol' => 'owner']);
        Local::factory()->create([
            'owner_id' => $owner->id,
            'stripe_subscription_id' => 'sub_con_dueno',
        ]);

        $this->artisan('locales:detect-orphan-stripe')->assertExitCode(0);
    }

    public function test_no_alerta_si_no_tiene_stripe_subscription(): void
    {
        Local::factory()->create([
            'owner_id' => null,
            'stripe_subscription_id' => null,
            'plan_status' => 'incomplete',
        ]);

        $this->artisan('locales:detect-orphan-stripe')->assertExitCode(0);
    }
}
