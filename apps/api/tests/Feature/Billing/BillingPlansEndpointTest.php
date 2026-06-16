<?php

namespace Tests\Feature\Billing;

use App\Models\Plan;
use Database\Seeders\PlansSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingPlansEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_plans_devuelve_planes_activos(): void
    {
        $this->seed(PlansSeeder::class);

        $res = $this->getJson('/api/v1/billing/plans')->assertOk();

        $data = $res->json('data');
        // F88 — ahora 3 planes activos (essential, professional, premium).
        $this->assertCount(3, $data);
        $this->assertEquals('essential',    $data[0]['slug']);
        $this->assertEquals('professional', $data[1]['slug']);
        $this->assertEquals('premium',      $data[2]['slug']);
        $this->assertEquals(14, $res->json('trial_days'));
    }

    public function test_checkout_rechaza_slug_invalido(): void
    {
        $this->postJson('/api/v1/billing/checkout', ['plan_slug' => 'no-existe'])
            ->assertStatus(422);
    }

    public function test_checkout_503_si_plan_no_tiene_stripe_price(): void
    {
        Plan::factory()->essential()->create(['stripe_price_id' => null]);

        $this->postJson('/api/v1/billing/checkout', ['plan_slug' => 'essential'])
            ->assertStatus(503)
            ->assertJsonPath('code', 'PLAN_NOT_PROVISIONED');
    }
}
