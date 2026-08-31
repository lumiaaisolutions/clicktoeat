<?php

namespace Tests\Feature;

use App\Models\Caja;
use App\Models\CuentaMesa;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\User;
use App\Services\Salon\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase D del roadmap de salón (docs/features/salon-roadmap.md): "todo pasa por
 * caja" + integridad de dinero. Cobro de mostrador, reconciliación al corte
 * (gap #6), cierre de cuenta marca pagado (gap #5), y aislamiento multi-tenant.
 */
class SalonCajaMostradorTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->localA = Local::create([
            'nombre' => 'Local A', 'slug' => 'local-a', 'whatsapp' => '5215500000001',
            'color_primario' => '#5C64B8', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Outfit', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->localB = Local::create([
            'nombre' => 'Local B', 'slug' => 'local-b', 'whatsapp' => '5215500000002',
            'color_primario' => '#5C64B8', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Outfit', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->ownerA = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->localA->id,
        ]);
    }

    private function pedidoMostrador(Local $local, float $total = 100): Pedido
    {
        return Pedido::create([
            'local_id' => $local->id,
            'codigo' => 'CE-'.strtoupper(substr(md5((string) mt_rand()), 0, 6)),
            'cliente_nombre' => 'Mostrador',
            'cliente_telefono' => '5215500000000',
            'whatsapp_url' => 'https://wa.me/5215500000000',
            'metodo_entrega' => 'sucursal',
            'metodo_pago' => 'efectivo',
            'estado' => 'confirmado',
            'estado_pago' => 'pendiente',
            'subtotal' => $total,
            'total' => $total,
        ]);
    }

    public function test_pedido_de_mostrador_aparece_como_pendiente_en_caja(): void
    {
        $this->pedidoMostrador($this->localA);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/caja/pendientes');

        $resp->assertOk();
        $this->assertCount(1, $resp->json('data'));
    }

    public function test_cobrar_pedido_de_mostrador_en_efectivo_lo_marca_pagado_y_liga_al_corte(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1', 'activa' => true]);
        $corte = app(CajaService::class)->abrirCorte($caja, $this->ownerA, 200.0);
        $pedido = $this->pedidoMostrador($this->localA, 100);

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedido->id}/cobrar", ['metodo_pago' => 'efectivo', 'corte_caja_id' => $corte->id])
            ->assertOk();

        $this->assertDatabaseHas('pedidos', ['id' => $pedido->id, 'estado_pago' => 'pagado', 'corte_caja_id' => $corte->id]);

        // El efectivo del mostrador entra en la reconciliación del corte (gap #6).
        $cerrado = app(CajaService::class)->cerrarCorte($corte->fresh(), $this->ownerA, 300.0);
        $this->assertEquals(300.0, (float) $cerrado->monto_esperado); // 200 inicial + 100 mostrador
        $this->assertEquals(0.0, (float) $cerrado->varianza);
    }

    public function test_cobro_con_tarjeta_no_entra_en_la_reconciliacion_de_efectivo(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1', 'activa' => true]);
        $corte = app(CajaService::class)->abrirCorte($caja, $this->ownerA, 200.0);
        $pedido = $this->pedidoMostrador($this->localA, 100);

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedido->id}/cobrar", ['metodo_pago' => 'tarjeta_tpv', 'corte_caja_id' => $corte->id])
            ->assertOk();

        $this->assertDatabaseHas('pedidos', ['id' => $pedido->id, 'estado_pago' => 'pagado', 'corte_caja_id' => null]);

        $cerrado = app(CajaService::class)->cerrarCorte($corte->fresh(), $this->ownerA, 200.0);
        $this->assertEquals(200.0, (float) $cerrado->monto_esperado); // solo el inicial
    }

    public function test_no_se_puede_cobrar_dos_veces(): void
    {
        $pedido = $this->pedidoMostrador($this->localA, 50);
        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedido->id}/cobrar", ['metodo_pago' => 'efectivo'])->assertOk();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedido->id}/cobrar", ['metodo_pago' => 'efectivo']);
        $resp->assertStatus(409);
    }

    public function test_no_se_puede_cobrar_pedido_de_mesa_por_este_endpoint(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);
        $cuenta = CuentaMesa::create(['local_id' => $this->localA->id, 'mesa_id' => $mesa->id, 'estado' => 'abierta']);
        $pedido = $this->pedidoMostrador($this->localA, 80);
        $pedido->update(['cuenta_mesa_id' => $cuenta->id]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedido->id}/cobrar", ['metodo_pago' => 'efectivo']);
        $resp->assertStatus(409);
        $this->assertDatabaseHas('pedidos', ['id' => $pedido->id, 'estado_pago' => 'pendiente']);
    }

    public function test_no_se_puede_cobrar_pedido_de_otro_local(): void
    {
        $pedidoB = $this->pedidoMostrador($this->localB, 100);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/pedidos/{$pedidoB->id}/cobrar", ['metodo_pago' => 'efectivo']);

        $this->assertContains($resp->getStatusCode(), [403, 404]);
        $this->assertDatabaseHas('pedidos', ['id' => $pedidoB->id, 'estado_pago' => 'pendiente']);
    }

    public function test_cerrar_cuenta_de_mesa_marca_sus_pedidos_pagados(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 9']);
        $service = app(\App\Services\Salon\CuentaMesaService::class);
        $cuenta = $service->abrirParaMesa($mesa);
        $pedido = $this->pedidoMostrador($this->localA, 100);
        $pedido->update(['mesa_id' => $mesa->id, 'metodo_entrega' => 'sucursal']);
        $service->adjuntarPedido($cuenta, $pedido);

        $service->cerrar($cuenta->fresh(), [['monto' => 100, 'metodo_pago' => 'efectivo']], 0.0, null);

        $this->assertDatabaseHas('pedidos', ['id' => $pedido->id, 'estado_pago' => 'pagado']);
    }

    public function test_pendientes_no_incluye_pedidos_de_otro_local(): void
    {
        $this->pedidoMostrador($this->localA);
        $this->pedidoMostrador($this->localB);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/caja/pendientes');

        $resp->assertOk();
        $this->assertCount(1, $resp->json('data'));
    }

    public function test_venta_con_mesa_adjunta_el_pedido_a_la_cuenta(): void
    {
        $cat = \App\Models\Categoria::create(['local_id' => $this->localA->id, 'nombre' => 'C', 'slug' => 'c', 'orden' => 0, 'activo' => true]);
        $prod = \App\Models\Producto::create(['local_id' => $this->localA->id, 'categoria_id' => $cat->id, 'nombre' => 'P', 'slug' => 'p', 'precio' => 30, 'disponible' => true]);
        $mesa = \App\Models\Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 3']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/pedidos', [
            'metodo_entrega' => 'sucursal',
            'metodo_pago' => 'efectivo',
            'mesa_id' => $mesa->id,
            'items' => [['producto_id' => $prod->id, 'cantidad' => 1]],
        ]);

        $resp->assertCreated();
        $pedidoId = $resp->json('data.id');
        $pedido = \App\Models\Pedido::withoutGlobalScopes()->find($pedidoId);
        $this->assertNotNull($pedido->cuenta_mesa_id); // adjuntado a la cuenta de la mesa
        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'estado' => 'ocupada']);
        // No aparece en pendientes de mostrador (tiene mesa/cuenta).
        $this->assertCount(0, $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/caja/pendientes')->json('data'));
    }
}
