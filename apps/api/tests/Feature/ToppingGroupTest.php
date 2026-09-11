<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\ToppingGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Catálogo reutilizable de toppings: CRUD del owner, aislamiento multi-tenant.
 */
class ToppingGroupTest extends TestCase
{
    use RefreshDatabase;

    private function localOwner(): array
    {
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();

        return [$local, $owner];
    }

    /** @test */
    public function owner_crea_y_lista_toppings(): void
    {
        [$local, $owner] = $this->localOwner();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/toppings', [
            'nombre' => 'Tamaño',
            'kind' => 'one',
            'required' => true,
            'items' => [['name' => 'Chico', 'price' => 0], ['name' => 'Grande', 'price' => 20]],
        ])->assertCreated()->assertJsonPath('data.nombre', 'Tamaño')->assertJsonPath('data.kind', 'one');

        $this->getJson('/api/v1/toppings')->assertOk()->assertJsonCount(1, 'data');
    }

    /** @test */
    public function toppings_estan_aislados_por_local(): void
    {
        [$l1, $o1] = $this->localOwner();
        ToppingGroup::create(['local_id' => $l1->id, 'nombre' => 'Salsas', 'kind' => 'many', 'items' => [['name' => 'Roja', 'price' => 0]]]);

        [$l2, $o2] = $this->localOwner();
        Sanctum::actingAs($o2);

        // El owner del local 2 NO ve los toppings del local 1.
        $this->getJson('/api/v1/toppings')->assertOk()->assertJsonCount(0, 'data');
    }

    /** @test */
    public function owner_edita_y_borra(): void
    {
        [$local, $owner] = $this->localOwner();
        $g = ToppingGroup::create(['local_id' => $local->id, 'nombre' => 'Extras', 'kind' => 'many', 'items' => [['name' => 'Queso', 'price' => 15]]]);
        Sanctum::actingAs($owner);

        $this->patchJson("/api/v1/toppings/{$g->id}", ['nombre' => 'Extras premium'])
            ->assertOk()->assertJsonPath('data.nombre', 'Extras premium');

        $this->deleteJson("/api/v1/toppings/{$g->id}")->assertNoContent();
        $this->assertDatabaseMissing('topping_groups', ['id' => $g->id]);
    }

    /** @test */
    public function staff_no_puede_crear_toppings(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        Sanctum::actingAs(User::factory()->staff($local)->create());

        $this->postJson('/api/v1/toppings', [
            'nombre' => 'X', 'kind' => 'many', 'items' => [['name' => 'A', 'price' => 0]],
        ])->assertForbidden();
    }
}
