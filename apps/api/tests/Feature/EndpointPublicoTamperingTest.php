<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cubre el vector #8 del threat-model:
 *   Tampering del payload del pedido público (extras con precio manipulado,
 *   item inexistente, grupo inexistente, producto de otro local).
 *
 * Estos tests deben pasar gracias al fix en OrderService::validarYNormalizarExtras.
 *
 * Ver: docs/security/threat-model.md vector #8
 */
class EndpointPublicoTamperingTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private Producto $producto;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::factory()->conHorarios()->create();
        $categoria   = Categoria::factory()->paraLocal($this->local)->create();

        // Producto con extras canónicos:
        //   Tortilla (one, required): Maíz $0 | Harina $5
        //   Salsas (many): Verde $0 | Habanero $0
        $this->producto = Producto::factory()
            ->paraLocal($this->local, $categoria)
            ->conExtras()
            ->create(['precio' => 30]);
    }

    /** @test */
    public function pedido_con_extras_validos_usa_precios_del_catalogo(): void
    {
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 1,
                'extras'      => [
                    ['group' => 'Tortilla', 'item' => 'Harina',   'price' => 5],
                    ['group' => 'Salsas',   'item' => 'Habanero', 'price' => 0],
                ],
            ]],
        ]);

        $resp->assertCreated();

        // precio = 30 (producto) + 5 (Harina) + 0 (Habanero) = 35
        $resp->assertJsonPath('data.subtotal', 35);
        $resp->assertJsonPath('data.total',    35);
    }

    /** @test */
    public function rechaza_extra_con_grupo_inexistente(): void
    {
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 1,
                'extras'      => [
                    ['group' => 'GrupoFantasma', 'item' => 'Harina', 'price' => 5],
                ],
            ]],
        ]);

        // 500 hoy (RuntimeException) — aceptable mientras se centraliza el manejo.
        // El test asegura que NO se acepta el pedido.
        $resp->assertStatus(500);
        $this->assertDatabaseMissing('pedidos', ['cliente_telefono' => '5215512345678']);
    }

    /** @test */
    public function rechaza_extra_con_item_inexistente_en_el_grupo(): void
    {
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 1,
                'extras'      => [
                    ['group' => 'Tortilla', 'item' => 'Oro Macizo', 'price' => 0],
                ],
            ]],
        ]);

        $resp->assertStatus(500);
        $this->assertDatabaseMissing('pedidos', ['cliente_telefono' => '5215512345678']);
    }

    /** @test */
    public function ignora_precio_del_cliente_y_usa_el_del_catalogo(): void
    {
        // El cliente manda Harina con price=999 (intento de inflar).
        // Backend debe ignorarlo y usar el catálogo (Harina = $5).
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 2,
                'extras'      => [
                    ['group' => 'Tortilla', 'item' => 'Harina', 'price' => 999],
                ],
            ]],
        ]);

        $resp->assertCreated();

        // (30 + 5) × 2 = 70  (NO 30 + 999 × 2)
        $resp->assertJsonPath('data.subtotal', 70);
    }

    /** @test */
    public function rechaza_precio_negativo_para_bajar_total(): void
    {
        // Cliente intenta `price: -100` para que el extra reste.
        // El FormRequest valida min:0 → 422 antes de llegar al service.
        // (Defensa en profundidad: si la validación se rompe, el service
        // también reemplaza por catálogo — ver `ignora_precio_del_cliente`.)
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 1,
                'extras'      => [
                    ['group' => 'Tortilla', 'item' => 'Harina', 'price' => -100],
                ],
            ]],
        ]);

        $resp->assertStatus(422)->assertJsonValidationErrors('items.0.extras.0.price');
    }

    /** @test */
    public function los_extras_persisten_normalizados_en_detalle_pedidos(): void
    {
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $this->producto->id,
                'cantidad'    => 1,
                'extras'      => [
                    ['group' => 'Tortilla', 'item' => 'Harina', 'price' => 999],
                ],
            ]],
        ])->assertCreated();

        // El detalle debe tener el extra con precio canónico (5), no el del cliente (999)
        $detalle = \App\Models\DetallePedido::first();
        $this->assertNotNull($detalle);
        $this->assertEquals([
            ['group' => 'Tortilla', 'item' => 'Harina', 'price' => 5],
        ], $detalle->extras_seleccionados);
    }

    /** @test */
    public function rechaza_pedido_con_producto_de_otro_local(): void
    {
        $otroLocal     = Local::factory()->conHorarios()->create();
        $otroCategoria = Categoria::factory()->paraLocal($otroLocal)->create();
        $otroProducto  = Producto::factory()->paraLocal($otroLocal, $otroCategoria)->create();

        // Intento: pedir un producto de OTRO local desde la landing de éste
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Xy', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [[
                'producto_id' => $otroProducto->id,
                'cantidad'    => 1,
            ]],
        ]);

        // OrderService rechaza porque el producto no pertenece al local resuelto por slug
        $resp->assertStatus(500);   // RuntimeException — pendiente centralizar a 422
        $this->assertDatabaseCount('pedidos', 0);
    }
}
