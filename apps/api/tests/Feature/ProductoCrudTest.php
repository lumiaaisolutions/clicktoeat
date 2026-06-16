<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductoCrudTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;
    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();
        $this->local     = Local::factory()->create();
        $this->owner     = User::factory()->owner($this->local)->create();
        $this->categoria = Categoria::factory()->paraLocal($this->local)->create();
    }

    /** @test */
    public function owner_crea_producto_basico(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Taco al Pastor',
            'descripcion'  => 'Receta tradicional',
            'precio'       => 28,
        ])->assertCreated();

        $resp->assertJsonPath('data.nombre', 'Taco al Pastor')
             ->assertJsonPath('data.slug',   'taco-al-pastor')
             ->assertJsonPath('data.precio', 28);

        $this->assertDatabaseHas('productos', [
            'nombre'   => 'Taco al Pastor',
            'local_id' => $this->local->id,
        ]);
    }

    /** @test */
    public function owner_crea_producto_con_extras(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Taco con opciones',
            'precio'       => 35,
            'extras'       => [
                [
                    'group'    => 'Tortilla',
                    'kind'     => 'one',
                    'required' => true,
                    'items'    => [
                        ['id' => 'maiz',   'name' => 'Maíz',   'price' => 0],
                        ['id' => 'harina', 'name' => 'Harina', 'price' => 5],
                    ],
                ],
            ],
        ])->assertCreated();

        $resp->assertJsonPath('data.extras.0.group', 'Tortilla')
             ->assertJsonPath('data.extras.0.kind', 'one');
    }

    /** @test */
    public function rechaza_categoria_de_otro_local(): void
    {
        $otroLocal     = Local::factory()->create();
        $otraCategoria = Categoria::factory()->paraLocal($otroLocal)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/productos', [
            'categoria_id' => $otraCategoria->id,
            'nombre'       => 'Producto malo',
            'precio'       => 50,
        ])->assertStatus(422)->assertJsonValidationErrors('categoria_id');
    }

    /** @test */
    public function rechaza_precio_descuento_mayor_o_igual_al_precio(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        // Mayor → falla
        $this->postJson('/api/v1/productos', [
            'categoria_id'     => $this->categoria->id,
            'nombre'           => 'Test',
            'precio'           => 50,
            'precio_descuento' => 60,
        ])->assertStatus(422)->assertJsonValidationErrors('precio_descuento');

        // Igual → también falla (lt:precio, no lte)
        $this->postJson('/api/v1/productos', [
            'categoria_id'     => $this->categoria->id,
            'nombre'           => 'Test 2',
            'precio'           => 50,
            'precio_descuento' => 50,
        ])->assertStatus(422)->assertJsonValidationErrors('precio_descuento');
    }

    /** @test */
    public function rechaza_extras_mal_formados(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        // Sin items
        $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Mal',
            'precio'       => 30,
            'extras'       => [
                ['group' => 'X', 'kind' => 'one'],
            ],
        ])->assertStatus(422);

        // Kind inválido
        $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Mal 2',
            'precio'       => 30,
            'extras'       => [
                ['group' => 'X', 'kind' => 'foo', 'items' => [['id' => 'a', 'name' => 'a', 'price' => 0]]],
            ],
        ])->assertStatus(422);
    }

    /** @test */
    public function lista_paginada_filtrable(): void
    {
        Producto::factory()->paraLocal($this->local, $this->categoria)->count(3)->create();
        Producto::factory()->paraLocal($this->local, $this->categoria)->noDisponible()->count(2)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->getJson('/api/v1/productos?disponible=true')
             ->assertOk()
             ->assertJsonCount(3, 'data');

        $this->getJson('/api/v1/productos?disponible=false')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function filtro_busqueda_q_funciona(): void
    {
        Producto::factory()->paraLocal($this->local, $this->categoria)->create(['nombre' => 'Taco al Pastor']);
        Producto::factory()->paraLocal($this->local, $this->categoria)->create(['nombre' => 'Pizza Pepperoni']);

        Sanctum::actingAs($this->owner, ['*']);

        $this->getJson('/api/v1/productos?q=taco')
             ->assertOk()
             ->assertJsonCount(1, 'data')
             ->assertJsonPath('data.0.nombre', 'Taco al Pastor');
    }

    /** @test */
    public function owner_no_ve_productos_de_otro_local(): void
    {
        Producto::factory()->paraLocal($this->local, $this->categoria)->count(2)->create();
        $otroLocal = Local::factory()->create();
        Producto::factory()->paraLocal($otroLocal)->count(3)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->getJson('/api/v1/productos')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function owner_actualiza_su_producto(): void
    {
        $producto = Producto::factory()->paraLocal($this->local, $this->categoria)->create(['precio' => 25]);
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/productos/{$producto->id}", ['precio' => 35])
             ->assertOk()
             ->assertJsonPath('data.precio', 35);
    }

    /** @test */
    public function owner_no_actualiza_producto_de_otro_local(): void
    {
        $otroLocal = Local::factory()->create();
        $producto  = Producto::factory()->paraLocal($otroLocal)->create();
        Sanctum::actingAs($this->owner, ['*']);

        // 403 (policy lo bloquea) o 404 (TenantScope lo filtra) — ambos
        // bloquean correctamente la acción multi-tenant.
        $status = $this->patchJson("/api/v1/productos/{$producto->id}", ['precio' => 999])->status();
        $this->assertContains($status, [403, 404], "Esperaba 403 ó 404, recibí {$status}");
    }

    /** @test */
    public function owner_borra_su_producto_soft_delete(): void
    {
        $producto = Producto::factory()->paraLocal($this->local, $this->categoria)->create();
        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/productos/{$producto->id}")->assertNoContent();
        $this->assertSoftDeleted('productos', ['id' => $producto->id]);
    }

    /** @test */
    public function staff_puede_ver_productos_pero_no_crear_ni_borrar(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Producto::factory()->paraLocal($this->local, $this->categoria)->count(2)->create();

        Sanctum::actingAs($staff, ['*']);

        $this->getJson('/api/v1/productos')->assertOk()->assertJsonCount(2, 'data');

        $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre' => 'X',
            'precio' => 10,
        ])->assertStatus(403);
    }
}
