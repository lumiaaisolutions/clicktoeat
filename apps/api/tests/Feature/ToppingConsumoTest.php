<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 2: al vender un producto con un topping que tiene receta, se descuenta
 * el inventario del topping (además de la receta del producto).
 */
class ToppingConsumoTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function pedido_con_topping_descuenta_su_ingrediente(): void
    {
        $local = Local::create([
            'nombre' => 'T', 'slug' => 'top-test', 'whatsapp' => '5215512345678',
            'color_primario' => '#000', 'color_secundario' => '#000', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true]);
        $queso = Ingrediente::create([
            'local_id' => $local->id, 'nombre' => 'Queso', 'stock' => 5, 'stock_minimo' => 0, 'unidad' => 'kg', 'activo' => true,
        ]);
        // Producto sin receta propia; el topping "Queso extra" consume 0.1 kg de queso.
        $taco = Producto::create([
            'local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'Taco', 'slug' => 'taco',
            'precio' => 30, 'disponible' => true,
            'extras' => [[
                'group' => 'Extras', 'kind' => 'many', 'required' => false,
                'items' => [['id' => 'x', 'name' => 'Queso extra', 'price' => 15, 'receta' => [['ingrediente_id' => $queso->id, 'cantidad' => 0.1]]]],
            ]],
        ]);

        $this->postJson("/api/v1/public/pedidos/{$local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [[
                'producto_id' => $taco->id, 'cantidad' => 2,
                'extras' => [['group' => 'Extras', 'item' => 'Queso extra', 'price' => 15]],
            ]],
        ])->assertCreated();

        // 5 - (2 * 0.1) = 4.8
        $this->assertEqualsWithDelta(4.8, (float) $queso->fresh()->stock, 0.001);
    }
}
