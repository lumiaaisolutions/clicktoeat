<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use App\Models\Plan;
use App\Support\Features;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_sin_plan_no_esta_activo(): void
    {
        $local = Local::factory()->create();
        $this->assertFalse($local->hasActivePlan());
    }

    public function test_trialing_y_active_estan_activos(): void
    {
        $trialing = Local::factory()->withPlan('essential', 'trialing')->create();
        $active   = Local::factory()->withPlan('essential', 'active')->create();
        $this->assertTrue($trialing->hasActivePlan());
        $this->assertTrue($active->hasActivePlan());
    }

    public function test_canceled_con_periodo_vigente_sigue_activo(): void
    {
        $local = Local::factory()->withPlan('essential', 'canceled')->create();
        $local->update(['current_period_ends_at' => now()->addDays(5)]);
        $this->assertTrue($local->fresh()->hasActivePlan());
    }

    public function test_canceled_con_periodo_vencido_NO_esta_activo(): void
    {
        $local = Local::factory()->withPlan('essential', 'canceled')->create();
        $local->update(['current_period_ends_at' => now()->subDay()]);
        $this->assertFalse($local->fresh()->hasActivePlan());
    }

    public function test_incomplete_NO_esta_activo(): void
    {
        $local = Local::factory()->withPlan('essential', 'incomplete')->create();
        $this->assertFalse($local->hasActivePlan());
    }

    public function test_features_has_solo_si_activo_y_feature_existe(): void
    {
        // Tras migrar a 2 planes (essential + professional), professional incluye
        // TODAS las features. essential mantiene subset.
        $pro = Local::factory()->withPlan('professional', 'active')->create()->refresh()->load('plan');
        $this->assertTrue(Features::has($pro, Features::INVENTARIO));
        $this->assertTrue(Features::has($pro, Features::RECETAS));
        $this->assertTrue(Features::has($pro, Features::POS));
        $this->assertTrue(Features::has($pro, Features::AUDIT_LOG));

        $ess = Local::factory()->withPlan('essential', 'active')->create()->refresh()->load('plan');
        $this->assertTrue(Features::has($ess, Features::POS));            // sí en essential
        $this->assertTrue(Features::has($ess, Features::QR_PERSONALIZADO));
        $this->assertFalse(Features::has($ess, Features::INVENTARIO));    // no en essential
        $this->assertFalse(Features::has($ess, Features::AUDIT_LOG));     // no en essential
    }
}
