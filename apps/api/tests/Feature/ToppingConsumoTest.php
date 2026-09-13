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
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111', 'email' => 'cliente@test.local'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [[
                'producto_id' => $taco->id, 'cantidad' => 2,
                'extras' => [['group' => 'Extras', 'item' => 'Queso extra', 'price' => 15]],
            ]],
        ])->assertCreated();

        // 5 - (2 * 0.1) = 4.8
        $this->assertEqualsWithDelta(4.8, (float) $queso->fresh()->stock, 0.001);
    }

    /** @test */
    public function menu_publico_marca_topping_agotado_sin_stock(): void
    {
        $local = Local::create([
            'nombre' => 'T', 'slug' => 'top-menu', 'whatsapp' => '5215512345678',
            'color_primario' => '#000', 'color_secundario' => '#000', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true]);
        $sinStock = Ingrediente::create(['local_id' => $local->id, 'nombre' => 'Tocino', 'stock' => 0, 'stock_minimo' => 0, 'unidad' => 'kg', 'activo' => true]);
        $conStock = Ingrediente::create(['local_id' => $local->id, 'nombre' => 'Queso', 'stock' => 5, 'stock_minimo' => 0, 'unidad' => 'kg', 'activo' => true]);

        Producto::create([
            'local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'Taco', 'slug' => 'taco',
            'precio' => 30, 'disponible' => true,
            'extras' => [[
                'group' => 'Extras', 'kind' => 'many', 'required' => false,
                'items' => [
                    ['id' => 'a', 'name' => 'Queso extra', 'price' => 10, 'receta' => [['ingrediente_id' => $conStock->id, 'cantidad' => 0.1]]],
                    ['id' => 'b', 'name' => 'Tocino', 'price' => 15, 'receta' => [['ingrediente_id' => $sinStock->id, 'cantidad' => 0.1]]],
                ],
            ]],
        ]);

        $items = $this->getJson("/api/v1/public/menu/{$local->slug}")
            ->assertOk()
            ->json('data.productos.0.extras.0.items');

        $this->assertTrue(collect($items)->firstWhere('name', 'Queso extra')['disponible']);
        $this->assertFalse(collect($items)->firstWhere('name', 'Tocino')['disponible']);
        // La receta interna NO se filtra al cliente.
        $this->assertArrayNotHasKey('receta', $items[0]);
    }

    /** @test */
    public function el_snapshot_guarda_el_nombre_de_la_opcion_no_el_id(): void
    {
        $local = Local::create([
            'nombre' => 'T', 'slug' => 'top-nombre', 'whatsapp' => '5215512345678',
            'color_primario' => '#000', 'color_secundario' => '#000', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true]);
        $taco = Producto::create([
            'local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'Taco', 'slug' => 'taco',
            'precio' => 30, 'disponible' => true,
            'extras' => [[
                'group' => 'Extras', 'kind' => 'many',
                'items' => [['id' => 'item-1789093107532', 'name' => 'Queso extra', 'price' => 15]],
            ]],
        ]);

        // El cliente manda el ID interno de la opción (como hace el front).
        $this->postJson("/api/v1/public/pedidos/{$local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111', 'email' => 'cliente@test.local'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [[
                'producto_id' => $taco->id, 'cantidad' => 1,
                'extras' => [['group' => 'Extras', 'item' => 'item-1789093107532', 'price' => 15]],
            ]],
        ])->assertCreated();

        $extra = \App\Models\DetallePedido::withoutGlobalScopes()->latest('id')->first()->extras_seleccionados[0];
        $this->assertSame('Queso extra', $extra['item']);   // nombre, no el id
        $this->assertStringNotContainsString('item-', $extra['item']);
    }
}
