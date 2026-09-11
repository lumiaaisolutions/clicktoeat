<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Límite de toppings por grupo: `incluidos` (los N más caros gratis) y `maximo`
 * (tope de selección). Se aplica en OrderService::validarYNormalizarExtras.
 */
class ToppingLimiteTest extends TestCase
{
    use RefreshDatabase;

    private function productoConGrupo(array $grupo): Producto
    {
        $local = Local::create([
            'nombre' => 'T', 'slug' => 'lim-'.substr(md5(json_encode($grupo)), 0, 6), 'whatsapp' => '5215512345678',
            'color_primario' => '#000', 'color_secundario' => '#000', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'C', 'slug' => 'c', 'orden' => 0, 'activo' => true]);

        return Producto::create([
            'local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'Fresas con crema', 'slug' => 'fresas',
            'precio' => 50, 'disponible' => true, 'extras' => [$grupo],
        ]);
    }

    private function pedir(Producto $p, array $items): \Illuminate\Testing\TestResponse
    {
        return $this->postJson("/api/v1/public/pedidos/{$p->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $p->id, 'cantidad' => 1, 'extras' => $items]],
        ]);
    }

    /** @test */
    public function incluidos_deja_gratis_las_opciones_mas_caras(): void
    {
        // 2 incluidos gratis; cliente elige 3 (choco 8, nuez 12, lechera 6).
        $p = $this->productoConGrupo([
            'group' => 'Toppings', 'kind' => 'many', 'incluidos' => 2,
            'items' => [
                ['id' => 'a', 'name' => 'Chocolate', 'price' => 8],
                ['id' => 'b', 'name' => 'Nuez', 'price' => 12],
                ['id' => 'c', 'name' => 'Lechera', 'price' => 6],
            ],
        ]);

        $this->pedir($p, [
            ['group' => 'Toppings', 'item' => 'Chocolate', 'price' => 8],
            ['group' => 'Toppings', 'item' => 'Nuez', 'price' => 12],
            ['group' => 'Toppings', 'item' => 'Lechera', 'price' => 6],
        ])->assertCreated();

        // Los 2 más caros (Nuez 12 + Chocolate 8) gratis; se cobra Lechera 6.
        $pedido = Pedido::latest('id')->first();
        $this->assertEqualsWithDelta(56.0, (float) $pedido->total, 0.001); // 50 + 6
    }

    /** @test */
    public function sin_incluidos_cobra_todas_las_opciones(): void
    {
        $p = $this->productoConGrupo([
            'group' => 'Toppings', 'kind' => 'many',
            'items' => [
                ['id' => 'a', 'name' => 'Chocolate', 'price' => 8],
                ['id' => 'b', 'name' => 'Nuez', 'price' => 12],
            ],
        ]);

        $this->pedir($p, [
            ['group' => 'Toppings', 'item' => 'Chocolate', 'price' => 8],
            ['group' => 'Toppings', 'item' => 'Nuez', 'price' => 12],
        ])->assertCreated();

        $this->assertEqualsWithDelta(70.0, (float) Pedido::latest('id')->first()->total, 0.001); // 50 + 8 + 12
    }

    /** @test */
    public function maximo_rechaza_si_elige_de_mas(): void
    {
        $p = $this->productoConGrupo([
            'group' => 'Toppings', 'kind' => 'many', 'maximo' => 2,
            'items' => [
                ['id' => 'a', 'name' => 'Chocolate', 'price' => 8],
                ['id' => 'b', 'name' => 'Nuez', 'price' => 12],
                ['id' => 'c', 'name' => 'Lechera', 'price' => 6],
            ],
        ]);

        $this->pedir($p, [
            ['group' => 'Toppings', 'item' => 'Chocolate', 'price' => 8],
            ['group' => 'Toppings', 'item' => 'Nuez', 'price' => 12],
            ['group' => 'Toppings', 'item' => 'Lechera', 'price' => 6],
        ])->assertStatus(500); // red de seguridad server-side; el cliente ya lo bloquea

        $this->assertSame(0, Pedido::count());
    }
}
