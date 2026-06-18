<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Valida que el cron `trials:expire-manual` cierre el ciclo del trial
 * manual sin Stripe — el caso que el webhook NO cubre.
 */
class ExpireManualTrialsTest extends TestCase
{
    use RefreshDatabase;

    public function test_trial_manual_vencido_pasa_a_incomplete(): void
    {
        $local = Local::factory()->create([
            'plan_status'            => 'trialing',
            'trial_ends_at'          => now()->subDay(),  // vencido ayer
            'stripe_subscription_id' => null,
            'pago_externo'           => false,
        ]);

        $this->artisan('trials:expire-manual')->assertExitCode(0);

        $this->assertEquals('incomplete', $local->fresh()->plan_status);
    }

    public function test_trial_vigente_no_se_toca(): void
    {
        $local = Local::factory()->create([
            'plan_status'            => 'trialing',
            'trial_ends_at'          => now()->addDays(5),  // todavía dentro
            'stripe_subscription_id' => null,
        ]);

        $this->artisan('trials:expire-manual')->assertExitCode(0);

        $this->assertEquals('trialing', $local->fresh()->plan_status);
    }

    public function test_trial_con_subscription_stripe_lo_maneja_el_webhook(): void
    {
        // Si tiene stripe_subscription_id, Stripe es la fuente de verdad —
        // este cron NO debe meter mano para no pisar datos del webhook.
        $local = Local::factory()->create([
            'plan_status'            => 'trialing',
            'trial_ends_at'          => now()->subDay(),
            'stripe_subscription_id' => 'sub_test_real',
        ]);

        $this->artisan('trials:expire-manual')->assertExitCode(0);

        $this->assertEquals('trialing', $local->fresh()->plan_status);
    }

    public function test_pago_externo_nunca_se_expira(): void
    {
        // Pago externo = el local paga al super_admin en efectivo. El trial
        // técnico está vencido pero NO debe bloquearse.
        $local = Local::factory()->create([
            'plan_status'            => 'trialing',
            'trial_ends_at'          => now()->subDays(30),
            'stripe_subscription_id' => null,
            'pago_externo'           => true,
        ]);

        $this->artisan('trials:expire-manual')->assertExitCode(0);

        $this->assertEquals('trialing', $local->fresh()->plan_status);
    }

    public function test_local_ya_incomplete_no_se_toca_de_nuevo(): void
    {
        // Idempotencia: si ya está incomplete, no lo procesa.
        $local = Local::factory()->create([
            'plan_status'            => 'incomplete',
            'trial_ends_at'          => now()->subDays(5),
            'stripe_subscription_id' => null,
        ]);

        $this->artisan('trials:expire-manual')->assertExitCode(0);

        $this->assertEquals('incomplete', $local->fresh()->plan_status);
    }
}
