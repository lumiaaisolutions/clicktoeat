<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use App\Models\Notificacion;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;
use App\Services\Inventory\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Cubre las 4 features de inventario avanzado:
 *  1. Re-stock al cancelar pedido (con idempotencia)
 *  2. Historial de movimientos por ingrediente
 *  3. Notificaciones de bajo stock automáticas
 *  4. Producto compuesto (receta recursiva + detección de ciclos)
 */
class InventarioAvanzadoTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User  $owner;
    protected Producto $taco;
    protected Ingrediente $tortilla;
    protected Ingrediente $carne;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Inv Test', 'slug' => 'inv-test', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'owner@inv.test',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->local->id,
        ]);
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->taco = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);
        $this->tortilla = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Tortilla',
            'stock' => 100, 'stock_minimo' => 10, 'unidad' => 'pz', 'activo' => true,
        ]);
        $this->carne = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Carne',
            'stock' => 5, 'stock_minimo' => 1, 'unidad' => 'kg', 'activo' => true,
        ]);
        Receta::create([
            'producto_id' => $this->taco->id,
            'ingrediente_id' => $this->tortilla->id,
            'cantidad' => 1,
        ]);
        Receta::create([
            'producto_id' => $this->taco->id,
            'ingrediente_id' => $this->carne->id,
            'cantidad' => 0.08,
        ]);
    }

    // ── 1. Re-stock al cancelar ─────────────────────────────────

    /** @test */
    public function cancelar_pedido_reintegra_el_stock_descontado(): void
    {
        // Crear pedido (descuenta)
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 5]],
        ])->assertCreated();

        $this->assertEqualsWithDelta(95.0,  (float) $this->tortilla->fresh()->stock, 0.001);
        $this->assertEqualsWithDelta(4.60,  (float) $this->carne->fresh()->stock,    0.001);

        $pedido = Pedido::firstOrFail();

        // Cancelar → debe reintegrar
        $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'cancelado');

        $this->assertEqualsWithDelta(100.0, (float) $this->tortilla->fresh()->stock, 0.001);
        $this->assertEqualsWithDelta(5.0,   (float) $this->carne->fresh()->stock,    0.001);

        // Hay movimientos: 2 salidas + 2 entradas (reintegro)
        $this->assertSame(4, MovimientoInventario::count());
        $this->assertSame(2, MovimientoInventario::where('referencia', "pedido:{$pedido->id}:reintegro")->count());
    }

    /** @test */
    public function cancelar_dos_veces_es_idempotente_no_duplica_reintegro(): void
    {
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 2]],
        ])->assertCreated();

        $pedido = Pedido::firstOrFail();

        // Cancelar 2 veces
        $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])->assertOk();
        $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])->assertOk();

        // Stock reintegrado UNA SOLA VEZ
        $this->assertEqualsWithDelta(100.0, (float) $this->tortilla->fresh()->stock, 0.001);
        // Solo 1 set de reintegros (2 ingredientes = 2 movimientos)
        $this->assertSame(2, MovimientoInventario::where('tipo', 'entrada')
            ->where('referencia', 'like', "pedido:{$pedido->id}:reintegro")->count());
    }

    /** @test */
    public function cancelar_pedido_ya_entregado_no_reintegra(): void
    {
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 3]],
        ])->assertCreated();

        $pedido = Pedido::firstOrFail();

        // Pasar a entregado primero, después cancelar
        $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'entregado'])->assertOk();
        $this->actingAs($this->owner, 'sanctum')
            ->patchJson("/api/v1/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])->assertOk();

        // Stock NO se reintegra (el cliente ya se lo comió)
        $this->assertEqualsWithDelta(97.0, (float) $this->tortilla->fresh()->stock, 0.001);
        $this->assertSame(0, MovimientoInventario::where('tipo', 'entrada')->count());
    }

    // ── 2. Historial de movimientos ─────────────────────────────

    /** @test */
    public function historial_de_movimientos_lista_filtrable_por_tipo(): void
    {
        // Genera movimientos
        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/ingredientes/{$this->tortilla->id}/ajuste", [
                'tipo' => 'entrada', 'cantidad' => 50, 'motivo' => 'Compra al proveedor',
            ])->assertOk();

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/ingredientes/{$this->tortilla->id}/ajuste", [
                'tipo' => 'merma', 'cantidad' => -3, 'motivo' => 'Se cayó al piso',
            ])->assertOk();

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/v1/ingredientes/{$this->tortilla->id}/movimientos");

        $resp->assertOk()->assertJsonCount(2, 'data');

        $respFiltrado = $this->actingAs($this->owner, 'sanctum')
            ->getJson("/api/v1/ingredientes/{$this->tortilla->id}/movimientos?tipo=entrada");

        $respFiltrado->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipo', 'entrada');
    }

    // ── 3. Notificaciones de bajo stock ─────────────────────────

    /** @test */
    public function descontar_bajo_el_minimo_crea_notificacion(): void
    {
        // Subimos el mínimo a 85 → pedir 16 tacos baja a 84 (cruza umbral)
        // y 16 × 0.08 = 1.28 kg de carne cabe dentro de los 5 kg disponibles.
        $this->tortilla->update(['stock_minimo' => 85]);

        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 16]],
        ])->assertCreated();

        $this->assertSame(1, Notificacion::where('tipo', 'bajo_stock')->count());

        $notif = Notificacion::firstOrFail();
        $this->assertStringContainsString('Tortilla', $notif->titulo);
        $this->assertSame($this->tortilla->id, (int) $notif->data['ingrediente_id']);
        $this->assertNull($notif->leida_at);
    }

    /** @test */
    public function dos_pedidos_seguidos_bajo_minimo_no_duplican_notificacion(): void
    {
        $this->tortilla->update(['stock_minimo' => 85]);

        // Primer pedido → cruza umbral → 1 notificación
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 16]],
        ])->assertCreated();

        // Segundo pedido → ya está bajo el mínimo, no debe crear otra (anti-spam)
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $this->taco->id, 'cantidad' => 2]],
        ])->assertCreated();

        $this->assertSame(1, Notificacion::where('tipo', 'bajo_stock')->count());
    }

    /** @test */
    public function endpoint_de_notificaciones_lista_y_marca_leida(): void
    {
        $notif = Notificacion::create([
            'local_id' => $this->local->id,
            'tipo' => 'bajo_stock', 'titulo' => 'Test', 'mensaje' => 'mensaje',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')->getJson('/api/v1/notificaciones');
        $resp->assertOk()
            ->assertJsonPath('no_leidas', 1)
            ->assertJsonPath('data.0.id', $notif->id);

        $this->actingAs($this->owner, 'sanctum')
            ->postJson("/api/v1/notificaciones/{$notif->id}/leer")
            ->assertOk();

        $this->assertNotNull($notif->fresh()->leida_at);
    }

    // ── 4. Producto compuesto ───────────────────────────────────

    /** @test */
    public function producto_compuesto_descuenta_los_ingredientes_del_componente(): void
    {
        // Producto compuesto "Combo" que incluye 2 tacos
        $combo = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $this->taco->categoria_id,
            'nombre' => 'Combo de 2 tacos', 'slug' => 'combo-2', 'precio' => 55, 'disponible' => true,
        ]);
        Receta::create([
            'producto_id'            => $combo->id,
            'componente_producto_id' => $this->taco->id,  // 1 combo = 2 tacos
            'cantidad'               => 2,
        ]);

        // 1 combo → expande a 2 tacos → 2 tortillas + 0.16 kg carne
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $combo->id, 'cantidad' => 1]],
        ])->assertCreated();

        $this->assertEqualsWithDelta(98.0,  (float) $this->tortilla->fresh()->stock, 0.001);
        $this->assertEqualsWithDelta(4.84,  (float) $this->carne->fresh()->stock,    0.001);
    }

    /** @test */
    public function producto_compuesto_de_compuesto_se_expande_dos_niveles(): void
    {
        $combo = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $this->taco->categoria_id,
            'nombre' => 'Combo 2', 'slug' => 'combo-2', 'precio' => 55, 'disponible' => true,
        ]);
        $megaCombo = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $this->taco->categoria_id,
            'nombre' => 'Mega Combo', 'slug' => 'mega', 'precio' => 110, 'disponible' => true,
        ]);
        // combo = 2 tacos
        Receta::create([
            'producto_id' => $combo->id, 'componente_producto_id' => $this->taco->id, 'cantidad' => 2,
        ]);
        // megaCombo = 2 combos = 4 tacos
        Receta::create([
            'producto_id' => $megaCombo->id, 'componente_producto_id' => $combo->id, 'cantidad' => 2,
        ]);

        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $megaCombo->id, 'cantidad' => 1]],
        ])->assertCreated();

        // 4 tacos = 4 tortillas + 0.32 kg carne
        $this->assertEqualsWithDelta(96.0,  (float) $this->tortilla->fresh()->stock, 0.001);
        $this->assertEqualsWithDelta(4.68,  (float) $this->carne->fresh()->stock,    0.001);
    }

    /** @test */
    public function detecta_ciclo_en_receta_y_lanza_excepcion(): void
    {
        // Producto A → componente B; Producto B → componente A. CICLO.
        $a = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $this->taco->categoria_id,
            'nombre' => 'A', 'slug' => 'a', 'precio' => 10, 'disponible' => true,
        ]);
        $b = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $this->taco->categoria_id,
            'nombre' => 'B', 'slug' => 'b', 'precio' => 10, 'disponible' => true,
        ]);
        Receta::create(['producto_id' => $a->id, 'componente_producto_id' => $b->id, 'cantidad' => 1]);
        Receta::create(['producto_id' => $b->id, 'componente_producto_id' => $a->id, 'cantidad' => 1]);

        // Intentar pedir A debe fallar; RuntimeException se propaga como 500
        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente' => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'items' => [['producto_id' => $a->id, 'cantidad' => 1]],
        ]);

        // 500 porque OrderService no captura RuntimeException de ciclo todavía
        $this->assertSame(500, $resp->status());
        // Y NO se creó el pedido
        $this->assertSame(0, Pedido::count());
    }

    /** @test */
    public function api_sync_recetas_rechaza_componente_que_apunta_al_mismo_producto(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->putJson("/api/v1/productos/{$this->taco->id}/recetas", [
                'recetas' => [
                    ['componente_producto_id' => $this->taco->id, 'cantidad' => 1],
                ],
            ])
            ->assertStatus(422);
    }
}
