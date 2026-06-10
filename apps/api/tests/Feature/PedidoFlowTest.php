<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;
use App\Services\Inventory\InventoryService;
use App\Services\Orders\OrderService;
use App\Services\WhatsApp\WhatsAppLinkBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PedidoFlowTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User  $owner;
    protected Categoria $categoria;
    protected Producto  $tacoPastor;
    protected Producto  $tacoSuadero;
    protected Ingrediente $tortilla;
    protected Ingrediente $carnePastor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre'         => 'Tacos Test',
            'slug'           => 'tacos-test',
            'whatsapp'       => '5215512345678',
            'color_primario' => '#FF2D2D',
            'color_secundario' => '#0B0B0F',
            'color_fondo'    => '#FAFAF7',
            'tipografia'     => 'Bricolage Grotesque',
            'delivery_fee'   => 35,
            'activo'         => true,
        ]);

        $this->owner = User::create([
            'nombre'   => 'Owner',
            'email'    => 'owner@tacos-test.local',
            'password' => Hash::make('password123'),
            'rol'      => 'owner',
            'local_id' => $this->local->id,
        ]);

        $this->categoria = Categoria::create([
            'local_id' => $this->local->id,
            'nombre'   => 'Tacos',
            'slug'     => 'tacos',
            'orden'    => 0,
            'activo'   => true,
        ]);

        $this->tacoPastor = Producto::create([
            'local_id'     => $this->local->id,
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Taco al Pastor',
            'slug'         => 'taco-al-pastor',
            'precio'       => 28,
            'disponible'   => true,
        ]);

        $this->tacoSuadero = Producto::create([
            'local_id'     => $this->local->id,
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Taco de Suadero',
            'slug'         => 'taco-de-suadero',
            'precio'       => 26,
            'disponible'   => true,
        ]);

        $this->tortilla = Ingrediente::create([
            'local_id' => $this->local->id,
            'nombre'   => 'Tortilla maíz',
            'stock'    => 10,        // sólo 10 para forzar shortage en algunos tests
            'unidad'   => 'pz',
            'activo'   => true,
        ]);

        $this->carnePastor = Ingrediente::create([
            'local_id' => $this->local->id,
            'nombre'   => 'Carne al pastor',
            'stock'    => 5,         // 5 kg
            'unidad'   => 'kg',
            'activo'   => true,
        ]);

        // Receta: 1 taco al pastor = 1 tortilla + 0.080 kg carne
        Receta::create([
            'producto_id'    => $this->tacoPastor->id,
            'ingrediente_id' => $this->tortilla->id,
            'cantidad'       => 1,
        ]);
        Receta::create([
            'producto_id'    => $this->tacoPastor->id,
            'ingrediente_id' => $this->carnePastor->id,
            'cantidad'       => 0.080,
        ]);
    }

    /** @test */
    public function el_endpoint_publico_de_menu_devuelve_el_local_y_productos(): void
    {
        $response = $this->getJson("/api/v1/public/menu/{$this->local->slug}");

        $response->assertOk()
            ->assertJsonPath('data.local.slug', $this->local->slug)
            ->assertJsonCount(2, 'data.productos');
    }

    /** @test */
    public function el_endpoint_publico_404_para_slug_inexistente(): void
    {
        $this->getJson('/api/v1/public/menu/no-existe')->assertNotFound();
    }

    /** @test */
    public function un_pedido_publico_se_crea_y_descuenta_inventario(): void
    {
        $response = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => [
                'nombre'   => 'María Pérez',
                'telefono' => '5215511112222',
            ],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [
                ['producto_id' => $this->tacoPastor->id, 'cantidad' => 3],
            ],
        ]);

        $response->assertCreated();

        $pedido = Pedido::firstWhere('cliente_telefono', '5215511112222');
        $this->assertNotNull($pedido);
        $this->assertSame(3 * 28.0, (float) $pedido->subtotal);   // 3 × $28
        $this->assertSame(0.0,      (float) $pedido->delivery_fee); // pickup
        $this->assertSame(84.0,     (float) $pedido->total);

        // Inventario descontado: 10 - 3 = 7 tortillas, 5 - 0.240 = 4.760 kg
        $this->assertEqualsWithDelta(7.0,   (float) $this->tortilla->fresh()->stock,    0.001);
        $this->assertEqualsWithDelta(4.760, (float) $this->carnePastor->fresh()->stock, 0.001);

        // Movimientos registrados
        $this->assertSame(2, MovimientoInventario::where('referencia', "pedido:{$pedido->id}")->count());

        // WhatsApp URL armada con el teléfono del local
        $this->assertStringContainsString('wa.me/5215512345678', (string) $pedido->whatsapp_url);
        $this->assertStringContainsString('Taco%20al%20Pastor', (string) $pedido->whatsapp_url);
    }

    /** @test */
    public function rechaza_pedido_si_no_hay_stock_y_no_descuenta_nada(): void
    {
        $stockInicialTortilla   = $this->tortilla->stock;
        $stockInicialCarne      = $this->carnePastor->stock;
        $pedidosAntes           = Pedido::count();

        $response = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215599999999'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [
                // Requiere 50 tortillas pero sólo hay 10 → debe fallar
                ['producto_id' => $this->tacoPastor->id, 'cantidad' => 50],
            ],
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('faltantes.0.ingrediente', 'Tortilla maíz');

        // Rollback: stock no cambió, no se creó pedido ni movimientos
        $this->assertSame((float) $stockInicialTortilla, (float) $this->tortilla->fresh()->stock);
        $this->assertSame((float) $stockInicialCarne,    (float) $this->carnePastor->fresh()->stock);
        $this->assertSame($pedidosAntes, Pedido::count());
        $this->assertSame(0, MovimientoInventario::count());
    }

    /** @test */
    public function producto_sin_receta_no_descuenta_inventario_pero_si_crea_pedido(): void
    {
        // tacoSuadero NO tiene receta
        $response = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215500000000'],
            'metodo_entrega' => 'delivery',
            'metodo_pago'    => 'tarjeta_entrega',
            'items' => [
                ['producto_id' => $this->tacoSuadero->id, 'cantidad' => 5],
            ],
            'cliente.direccion' => null,
        ]);

        $response->assertCreated();

        $pedido = Pedido::firstWhere('cliente_telefono', '5215500000000');
        $this->assertSame('delivery', $pedido->metodo_entrega);
        $this->assertSame(35.0,  (float) $pedido->delivery_fee);
        $this->assertSame(5 * 26.0 + 35.0, (float) $pedido->total);

        // Inventario sin tocar — no había receta
        $this->assertSame(10.0, (float) $this->tortilla->fresh()->stock);
        $this->assertSame(5.0,  (float) $this->carnePastor->fresh()->stock);
        $this->assertSame(0, MovimientoInventario::count());
    }

    /** @test */
    public function rechaza_producto_no_disponible(): void
    {
        $this->tacoPastor->update(['disponible' => false]);

        $response = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215500000000'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items' => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 1]],
        ]);

        $response->assertStatus(500); // RuntimeException de OrderService — sin manejo dedicado todavía
        $this->assertSame(0, Pedido::count());
    }

    /** @test */
    public function el_owner_ve_solo_pedidos_de_su_local(): void
    {
        // Crea otro local + pedido en otro tenant
        $otroLocal = Local::create([
            'nombre' => 'Otro', 'slug' => 'otro', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        Pedido::create([
            'local_id' => $otroLocal->id,
            'cliente_nombre' => 'Foreign', 'cliente_telefono' => '5215588888888',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 100, 'total' => 100, 'estado' => 'nuevo',
        ]);

        // Pedido en MI local
        Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'Mine', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 50, 'total' => 50, 'estado' => 'nuevo',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/pedidos');

        $resp->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.cliente_nombre', 'Mine');
    }

    /** @test */
    public function owner_puede_cambiar_estado_de_su_pedido(): void
    {
        $pedido = Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 50, 'total' => 50, 'estado' => 'nuevo',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'confirmado']);

        $resp->assertOk()->assertJsonPath('data.estado', 'confirmado');
        $this->assertNotNull($pedido->fresh()->confirmado_at);
    }

    /** @test */
    public function owner_no_puede_modificar_pedidos_de_otro_local(): void
    {
        $otroLocal = Local::create([
            'nombre' => 'Otro', 'slug' => 'otro', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $pedidoAjeno = Pedido::create([
            'local_id' => $otroLocal->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 50, 'total' => 50, 'estado' => 'nuevo',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedidoAjeno->id}/estado", ['estado' => 'cancelado']);

        // Defensa en profundidad: 404 si el scope filtró, 403 si la policy denegó.
        // Ambos son aceptables — lo crítico es que el estado NO cambió.
        $this->assertContains($resp->status(), [403, 404]);
        $this->assertSame('nuevo', $pedidoAjeno->fresh()->estado);
    }

    /**
     * Nota: el guard `DB::transactionLevel() === 0` no se puede probar bajo
     * RefreshDatabase porque el trait envuelve cada test en una transacción
     * (transactionLevel >= 1 siempre). En su lugar verificamos el camino feliz
     * dentro de transacción.
     *
     * @test
     */
    public function el_inventory_service_descuenta_correctamente_dentro_de_transaccion(): void
    {
        $service = app(InventoryService::class);
        $pedido  = Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 0, 'total' => 0, 'estado' => 'nuevo',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($service, $pedido) {
            $service->descontarParaPedido($pedido, [
                ['producto_id' => $this->tacoPastor->id, 'cantidad' => 2],
            ]);
        });

        $this->assertEqualsWithDelta(8.0,    (float) $this->tortilla->fresh()->stock,    0.001);
        $this->assertEqualsWithDelta(4.840,  (float) $this->carnePastor->fresh()->stock, 0.001);
    }

    /** @test */
    public function el_whatsapp_url_incluye_los_items_y_total(): void
    {
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Test', 'telefono' => '5215500000001'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $this->tacoPastor->id, 'cantidad' => 2]],
        ])->assertCreated();

        $url = $resp->json('whatsapp_url');
        $this->assertNotNull($url);
        $this->assertStringStartsWith('https://wa.me/', $url);
        $decoded = urldecode(parse_url($url, PHP_URL_QUERY) ?? '');
        $this->assertStringContainsString('Taco al Pastor', $decoded);
        $this->assertStringContainsString('Total:', $decoded);
    }
}
