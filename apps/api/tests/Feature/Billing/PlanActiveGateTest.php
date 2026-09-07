<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Gate server-side de plan activo (App\Http\Middleware\EnsureActivePlan):
 * cierra el bypass donde un local con suscripción vencida podía seguir
 * escribiendo por la API directa.
 */
class PlanActiveGateTest extends TestCase
{
    use RefreshDatabase;

    private function actorConPlan(string $status): User
    {
        $local = Local::factory()->withPlan('professional', $status)->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        return $owner;
    }

    /** @test */
    public function plan_inactivo_bloquea_escrituras_con_402(): void
    {
        $this->actorConPlan('incomplete');

        $this->postJson('/api/v1/productos', [])
            ->assertStatus(402)
            ->assertJsonPath('code', 'PLAN_INACTIVE');
    }

    /** @test */
    public function plan_inactivo_permite_lecturas(): void
    {
        $this->actorConPlan('incomplete');

        // GET pasa (el dueño debe poder ver sus datos aunque no pague).
        $this->getJson('/api/v1/productos')->assertOk();
    }

    /** @test */
    public function plan_inactivo_permite_ajustes_del_local_para_reactivar(): void
    {
        $this->actorConPlan('incomplete');

        // PATCH /local está en el allowlist → no debe devolver 402.
        $resp = $this->patchJson('/api/v1/local', ['nombre' => 'Nuevo Nombre']);
        $this->assertNotSame(402, $resp->status());
    }

    /** @test */
    public function plan_activo_no_es_bloqueado_por_el_gate(): void
    {
        $this->actorConPlan('active');

        // Pasa el gate; falla la validación del FormRequest (422), no 402.
        $this->postJson('/api/v1/productos', [])->assertStatus(422);
    }

    /** @test */
    public function local_sin_plan_no_se_gatea_backwards_compat(): void
    {
        $local = Local::factory()->create(); // plan_id null
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        // Sin plan asignado no gateamos: pasa el gate y cae en validación (422).
        $this->postJson('/api/v1/productos', [])->assertStatus(422);
    }
}
