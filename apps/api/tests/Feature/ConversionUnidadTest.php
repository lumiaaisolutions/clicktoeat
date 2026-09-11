<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\ToppingGroup;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Al cambiar la unidad de un ingrediente, se convierten automáticamente su
 * stock/mínimo/costo Y todas las cantidades de receta (tabla, toppings, productos).
 */
class ConversionUnidadTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function cambiar_kg_a_g_convierte_todo(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        $owner = User::factory()->owner($local)->create();
        Sanctum::actingAs($owner);

        $ing = Ingrediente::create([
            'local_id' => $local->id, 'nombre' => 'Crema', 'stock' => 5, 'stock_minimo' => 1,
            'unidad' => 'kg', 'costo_unitario' => 40, 'activo' => true,
        ]);
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'C', 'slug' => 'c', 'orden' => 0, 'activo' => true]);
        $prod = Producto::create([
            'local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'Fresas', 'slug' => 'fresas',
            'precio' => 50, 'disponible' => true,
            'extras' => [[
                'group' => 'Toppings', 'kind' => 'many',
                'items' => [['id' => 'a', 'name' => 'Extra crema', 'price' => 5, 'receta' => [['ingrediente_id' => $ing->id, 'cantidad' => 0.05]]]],
            ]],
        ]);
        Receta::create(['producto_id' => $prod->id, 'ingrediente_id' => $ing->id, 'cantidad' => 0.111]);
        $top = ToppingGroup::create([
            'local_id' => $local->id, 'nombre' => 'T', 'kind' => 'many',
            'items' => [['name' => 'X', 'price' => 0, 'receta' => [['ingrediente_id' => $ing->id, 'cantidad' => 0.02]]]],
        ]);

        // El formulario manda los valores en la unidad ANTERIOR (kg) + nueva unidad.
        $this->patchJson("/api/v1/ingredientes/{$ing->id}", [
            'stock' => 5, 'stock_minimo' => 1, 'unidad' => 'g', 'costo_unitario' => 40,
        ])->assertOk();

        $ing->refresh();
        $this->assertSame('g', $ing->unidad);
        $this->assertEqualsWithDelta(5000, (float) $ing->stock, 0.001);
        $this->assertEqualsWithDelta(1000, (float) $ing->stock_minimo, 0.001);
        $this->assertEqualsWithDelta(0.04, (float) $ing->costo_unitario, 0.0001); // $40/kg → $0.04/g

        $this->assertEqualsWithDelta(111, (float) Receta::first()->cantidad, 0.001);          // 0.111 kg → 111 g
        $this->assertEqualsWithDelta(50, (float) $prod->fresh()->extras[0]['items'][0]['receta'][0]['cantidad'], 0.001); // 0.05→50
        $this->assertEqualsWithDelta(20, (float) $top->fresh()->items[0]['receta'][0]['cantidad'], 0.001); // 0.02→20
    }

    /** @test */
    public function cambio_incompatible_no_convierte(): void
    {
        $local = Local::factory()->withPlan('professional')->create();
        Sanctum::actingAs(User::factory()->owner($local)->create());
        $ing = Ingrediente::create([
            'local_id' => $local->id, 'nombre' => 'Agua', 'stock' => 3, 'stock_minimo' => 1,
            'unidad' => 'kg', 'costo_unitario' => 10, 'activo' => true,
        ]);

        // kg (masa) → l (volumen): no convertible. Se guarda tal cual.
        $this->patchJson("/api/v1/ingredientes/{$ing->id}", ['stock' => 3, 'unidad' => 'l'])->assertOk();
        $ing->refresh();
        $this->assertSame('l', $ing->unidad);
        $this->assertEqualsWithDelta(3, (float) $ing->stock, 0.001); // sin conversión
    }
}
