<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoriaCrudTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->local = Local::factory()->create();
        $this->owner = User::factory()->owner($this->local)->create();
    }

    /** @test */
    public function owner_lista_solo_categorias_de_su_local(): void
    {
        Categoria::factory()->paraLocal($this->local)->count(3)->create();

        $otroLocal = Local::factory()->create();
        Categoria::factory()->paraLocal($otroLocal)->count(2)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/categorias')->assertOk();

        $this->assertCount(3, $resp->json('data'));
    }

    /** @test */
    public function owner_crea_categoria_con_slug_auto_generado(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/categorias', [
            'nombre' => 'Especiales del Chef',
            'icono'  => 'fa-star',
            'orden'  => 5,
        ])->assertCreated();

        $resp->assertJsonPath('data.nombre', 'Especiales del Chef')
             ->assertJsonPath('data.slug',   'especiales-del-chef')
             ->assertJsonPath('data.local_id', $this->local->id);
    }

    /** @test */
    public function rechaza_slug_duplicado_dentro_del_mismo_local(): void
    {
        Categoria::factory()->paraLocal($this->local)->create(['slug' => 'tacos']);
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/categorias', [
            'nombre' => 'Tacos',
            'slug'   => 'tacos',
        ])->assertStatus(422)->assertJsonValidationErrors('slug');
    }

    /** @test */
    public function permite_mismo_slug_en_locales_distintos(): void
    {
        $otroLocal = Local::factory()->create();
        Categoria::factory()->paraLocal($otroLocal)->create(['slug' => 'tacos']);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/categorias', [
            'nombre' => 'Tacos',
            'slug'   => 'tacos',
        ])->assertCreated();
    }

    /** @test */
    public function staff_no_puede_crear_categoria(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson('/api/v1/categorias', [
            'nombre' => 'Especiales',
        ])->assertStatus(403);
    }

    /** @test */
    public function owner_actualiza_su_categoria(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create(['nombre' => 'Original']);
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/categorias/{$cat->id}", [
            'nombre' => 'Renombrada',
        ])->assertOk()->assertJsonPath('data.nombre', 'Renombrada');
    }

    /** @test */
    public function owner_no_puede_actualizar_categoria_de_otro_local(): void
    {
        $otroLocal = Local::factory()->create();
        $cat       = Categoria::factory()->paraLocal($otroLocal)->create();

        Sanctum::actingAs($this->owner, ['*']);

        // 404 porque el TenantScope hace invisible la categoría ajena
        $this->patchJson("/api/v1/categorias/{$cat->id}", [
            'nombre' => 'Hijack',
        ])->assertNotFound();
    }

    /** @test */
    public function delete_categoria_sin_productos_funciona(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/categorias/{$cat->id}")->assertNoContent();
        $this->assertDatabaseMissing('categorias', ['id' => $cat->id]);
    }

    /** @test */
    public function delete_categoria_con_productos_devuelve_409(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Producto::factory()->paraLocal($this->local, $cat)->count(2)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/categorias/{$cat->id}")
             ->assertStatus(409)
             ->assertJson(['message' => 'No se puede eliminar: la categoría tiene productos. Reasígnalos primero.']);

        $this->assertDatabaseHas('categorias', ['id' => $cat->id]);
    }

    /** @test */
    public function index_incluye_productos_count(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Producto::factory()->paraLocal($this->local, $cat)->count(3)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->getJson('/api/v1/categorias')
             ->assertOk()
             ->assertJsonPath('data.0.productos_count', 3);
    }

    /** @test */
    public function filtro_activo_funciona(): void
    {
        Categoria::factory()->paraLocal($this->local)->count(2)->create(['activo' => true]);
        Categoria::factory()->paraLocal($this->local)->inactiva()->count(1)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->getJson('/api/v1/categorias?activo=true')
             ->assertOk()
             ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/categorias?activo=false')
             ->assertOk()
             ->assertJsonCount(1, 'data');
    }
}
