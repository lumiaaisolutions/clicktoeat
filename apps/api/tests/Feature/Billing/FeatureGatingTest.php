<?php

namespace Tests\Feature\Billing;

use App\Models\Local;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FeatureGatingTest extends TestCase
{
    use RefreshDatabase;

    public function test_essential_no_accede_a_inventario(): void
    {
        $local = Local::factory()->withPlan('essential')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/ingredientes')
            ->assertStatus(402)
            ->assertJsonPath('code', 'FEATURE_LOCKED')
            ->assertJsonPath('required_feature', 'inventario');
    }

    public function test_professional_accede_a_inventario(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/ingredientes')->assertOk();
    }

    public function test_professional_accede_a_audit_log(): void
    {
        // Tras la migración a 2 planes (essential + professional), audit_log
        // está incluido en el plan Profesional (antes era exclusivo Premium).
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/audit-logs')->assertOk();
    }

    public function test_essential_NO_accede_a_audit_log(): void
    {
        $local = Local::factory()->withPlan('essential')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/audit-logs')
            ->assertStatus(402)
            ->assertJsonPath('code', 'FEATURE_LOCKED')
            ->assertJsonPath('required_feature', 'audit_log');
    }

    public function test_essential_alcanza_limite_de_productos(): void
    {
        $local = Local::factory()->withPlan('essential')->create();
        // Categoría real del mismo local para que el FormRequest valide ok.
        $categoria = \App\Models\Categoria::factory()->create(['local_id' => $local->id]);
        Producto::factory()->count(30)->create(['local_id' => $local->id, 'categoria_id' => $categoria->id]);

        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        // El producto 31 debe ser rechazado con PLAN_LIMIT
        $this->postJson('/api/v1/productos', [
            'nombre'       => 'Producto rechazado',
            'precio'       => 100,
            'categoria_id' => $categoria->id,
        ])->assertStatus(402)
          ->assertJsonPath('code', 'PLAN_LIMIT')
          ->assertJsonPath('limit', 30);
    }

    public function test_plan_inactive_bloquea_endpoint_gated(): void
    {
        $local = Local::factory()->withPlan('professional', 'incomplete')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/ingredientes')
            ->assertStatus(402)
            ->assertJsonPath('code', 'PLAN_INACTIVE');
    }
}
