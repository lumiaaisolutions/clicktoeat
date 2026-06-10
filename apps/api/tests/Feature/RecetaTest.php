<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RecetaTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User $owner;
    protected Producto $producto;
    protected Ingrediente $tortilla;
    protected Ingrediente $carne;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Tacos R', 'slug' => 'tacos-r', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'owner@r.test',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->local->id,
        ]);
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->producto = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);
        $this->tortilla = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Tortilla',
            'stock' => 100, 'unidad' => 'pz', 'activo' => true,
        ]);
        $this->carne = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Carne',
            'stock' => 5, 'unidad' => 'kg', 'activo' => true,
        ]);
    }

    /** @test */
    public function owner_puede_actualizar_la_receta_de_su_producto(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [
                    ['ingrediente_id' => $this->tortilla->id, 'cantidad' => 1],
                    ['ingrediente_id' => $this->carne->id,    'cantidad' => 0.08],
                ],
            ]);

        $resp->assertOk();

        $this->assertSame(2, Receta::where('producto_id', $this->producto->id)->count());
        $this->assertEqualsWithDelta(0.08,
            (float) Receta::where('producto_id', $this->producto->id)
                ->where('ingrediente_id', $this->carne->id)
                ->value('cantidad'),
            0.001,
        );
    }

    /** @test */
    public function actualizar_receta_es_idempotente_reemplaza_completo(): void
    {
        Receta::create([
            'producto_id' => $this->producto->id,
            'ingrediente_id' => $this->tortilla->id,
            'cantidad' => 1,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [
                    ['ingrediente_id' => $this->carne->id, 'cantidad' => 0.1],
                ],
            ])
            ->assertOk();

        // La tortilla anterior debe haber desaparecido
        $this->assertSame(1, Receta::where('producto_id', $this->producto->id)->count());
        $this->assertDatabaseMissing('recetas', [
            'producto_id'    => $this->producto->id,
            'ingrediente_id' => $this->tortilla->id,
        ]);
    }

    /** @test */
    public function permite_borrar_toda_la_receta_con_array_vacio(): void
    {
        Receta::create([
            'producto_id' => $this->producto->id,
            'ingrediente_id' => $this->tortilla->id,
            'cantidad' => 1,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [],
            ])
            ->assertOk();

        $this->assertSame(0, Receta::where('producto_id', $this->producto->id)->count());
    }

    /** @test */
    public function rechaza_ingrediente_de_otro_local(): void
    {
        $otroLocal = Local::create([
            'nombre' => 'O', 'slug' => 'o', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $ingAjeno = Ingrediente::create([
            'local_id' => $otroLocal->id, 'nombre' => 'Foreign',
            'stock' => 10, 'unidad' => 'pz', 'activo' => true,
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [
                    ['ingrediente_id' => $ingAjeno->id, 'cantidad' => 1],
                ],
            ]);

        $resp->assertStatus(422)
            ->assertJsonStructure(['errors' => ['recetas.0.ingrediente_id']]);
    }

    /** @test */
    public function rechaza_cantidad_cero_o_negativa(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [
                    ['ingrediente_id' => $this->tortilla->id, 'cantidad' => 0],
                ],
            ])
            ->assertStatus(422);

        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->producto->id}/recetas", [
                'recetas' => [
                    ['ingrediente_id' => $this->tortilla->id, 'cantidad' => -1],
                ],
            ])
            ->assertStatus(422);
    }

    /** @test */
    public function owner_no_puede_editar_recetas_de_producto_ajeno(): void
    {
        $otroLocal = Local::create([
            'nombre' => 'O', 'slug' => 'o', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $otroCat = Categoria::create([
            'local_id' => $otroLocal->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prodAjeno = Producto::create([
            'local_id' => $otroLocal->id, 'categoria_id' => $otroCat->id,
            'nombre' => 'X', 'slug' => 'x', 'precio' => 10, 'disponible' => true,
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$prodAjeno->id}/recetas", [
                'recetas' => [],
            ]);

        // 404 (scope filtra) o 403 (policy rechaza) — ambos correctos
        $this->assertContains($resp->status(), [403, 404]);
    }
}
