<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Alerta de trials colgados (trials:alert-stuck): detecta, sin mutar, locales
 * que siguen `trialing` >24h tras vencer. Red de seguridad contra fallos del
 * scheduler / webhooks de Stripe.
 */
class AlertStuckTrialsTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function detecta_trial_colgado_y_no_lo_muta(): void
    {
        Log::spy();

        $stuck = Local::factory()->withPlan('professional', 'trialing')
            ->create(['trial_ends_at' => now()->subDays(2)]);

        $this->artisan('trials:alert-stuck')->assertSuccessful();

        // Es un detector, no un mutador: el estado NO cambia.
        $this->assertSame('trialing', $stuck->fresh()->plan_status);

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($msg, $ctx = []) => str_contains($msg, 'colgados') && ($ctx['total'] ?? 0) === 1)
            ->once();
    }

    /** @test */
    public function no_alerta_si_el_trial_esta_vigente_o_es_pago_externo(): void
    {
        Log::spy();

        // Trial vigente (vence en el futuro) → no cuelga.
        Local::factory()->withPlan('professional', 'trialing')->create();

        // Trial vencido pero pago_externo → excluido (paga fuera de Stripe).
        Local::factory()->withPlan('professional', 'trialing')
            ->create(['trial_ends_at' => now()->subDays(2), 'pago_externo' => true]);

        $this->artisan('trials:alert-stuck')->assertSuccessful();

        Log::shouldNotHaveReceived('warning');
    }
}
