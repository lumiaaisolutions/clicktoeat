<?php

namespace Tests\Feature;

use App\Models\Caja;
use App\Models\Categoria;
use App\Models\CorteCaja;
use App\Models\CuentaMesa;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * F102 — Etapa B (cuenta de mesa, caja física, cortes, tip pooling).
 */
class CuentaMesaYCajaTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected Producto $productoA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->localA = Local::create([
            'nombre' => 'Local A', 'slug' => 'local-a', 'whatsapp' => '5215500000001',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->localB = Local::create([
            'nombre' => 'Local B', 'slug' => 'local-b', 'whatsapp' => '5215500000002',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->ownerA = User::create([
            'nombre' => 'Owner A', 'email' => 'owner@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->localA->id,
        ]);

        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->productoA = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 50, 'disponible' => true,
        ]);
    }

    private function crearPedidoEnMesa(Mesa $mesa, int $cantidad = 2): void
    {
        $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/pedidos", [
            'items' => [['producto_id' => $this->productoA->id, 'cantidad' => $cantidad]],
        ])->assertCreated();
    }

    public function test_pedido_de_mesa_crea_cuenta_abierta_automaticamente(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);
        $this->crearPedidoEnMesa($mesa);

        $this->assertDatabaseHas('cuentas_mesa', ['mesa_id' => $mesa->id, 'estado' => 'abierta']);
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();
        $this->assertSame('100.00', number_format((float) $cuenta->subtotal, 2, '.', ''));
    }

    public function test_dos_pedidos_de_la_misma_mesa_comparten_una_sola_cuenta(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 2']);
        $this->crearPedidoEnMesa($mesa, 1);
        $this->crearPedidoEnMesa($mesa, 1);

        $this->assertSame(1, CuentaMesa::where('mesa_id', $mesa->id)->count());
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();
        $this->assertSame(2, $cuenta->pedidos()->count());
    }

    public function test_owner_cierra_cuenta_con_pago_unico(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 3']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 100, 'metodo_pago' => 'efectivo']],
            ]);

        $resp->assertOk()->assertJsonPath('data.estado', 'cerrada');
        $this->assertSame('libre', $mesa->fresh()->estado);
    }

    public function test_owner_cierra_cuenta_con_split_bill_y_pago_mixto(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 4']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [
                    ['monto' => 60, 'metodo_pago' => 'efectivo', 'pagado_por' => 'Persona 1'],
                    ['monto' => 40, 'metodo_pago' => 'tarjeta_tpv', 'pagado_por' => 'Persona 2'],
                ],
            ]);

        $resp->assertOk();
        $this->assertDatabaseHas('pagos_cuenta_mesa', ['cuenta_mesa_id' => $cuenta->id, 'monto' => 60]);
        $this->assertDatabaseHas('pagos_cuenta_mesa', ['cuenta_mesa_id' => $cuenta->id, 'monto' => 40]);
    }

    public function test_pagos_que_no_cubren_el_total_son_rechazados(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 5']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 50, 'metodo_pago' => 'efectivo']],
            ]);

        $resp->assertStatus(409);
        $this->assertSame('abierta', $cuenta->fresh()->estado);
    }

    public function test_propina_se_reparte_por_rol_configurado(): void
    {
        $this->localA->update(['reglas_propina' => ['mesero' => 60, 'cocina' => 40]]);
        $mesero = User::create([
            'nombre' => 'Mesero', 'email' => 'mesero@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['mesero'],
        ]);
        $cocinero = User::create([
            'nombre' => 'Cocinero', 'email' => 'cocina@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['cocina'],
        ]);
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 6']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 120, 'metodo_pago' => 'efectivo']],
                'propina' => 20,
            ])->assertOk();

        $this->assertDatabaseHas('propinas_reparto', ['user_id' => $mesero->id, 'monto' => 12]); // 60% de 20
        $this->assertDatabaseHas('propinas_reparto', ['user_id' => $cocinero->id, 'monto' => 8]); // 40% de 20
    }

    public function test_owner_no_puede_cerrar_cuenta_de_otro_local(): void
    {
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B1']);
        $cuentaB = CuentaMesa::create(['local_id' => $this->localB->id, 'mesa_id' => $mesaB->id, 'estado' => 'abierta']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuentaB->id}/cerrar", [
                'pagos' => [['monto' => 1, 'metodo_pago' => 'efectivo']],
            ]);

        $this->assertContains($resp->getStatusCode(), [403, 404]);
        $this->assertSame('abierta', $cuentaB->fresh()->estado);
    }

    public function test_flujo_completo_de_caja_abrir_movimiento_cerrar_con_varianza(): void
    {
        $resp = $this->actingAs($this->ownerA, 'sanctum')->postJson('/api/v1/cajas', ['nombre' => 'Caja 1']);
        $resp->assertCreated();
        $caja = Caja::find($resp->json('data.id'));

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 500]);
        $resp->assertCreated();
        $corte = CorteCaja::find($resp->json('data.id'));

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cortes-caja/{$corte->id}/movimientos", ['tipo' => 'retiro', 'monto' => 100, 'motivo' => 'Pago proveedor'])
            ->assertCreated();

        // Esperado: 500 - 100 = 400. Contado: 390 → varianza -10.
        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cortes-caja/{$corte->id}/cerrar", ['monto_contado' => 390]);

        $resp->assertOk();
        $this->assertSame('400.00', $resp->json('data.monto_esperado'));
        $this->assertSame('-10.00', $resp->json('data.varianza'));
    }

    public function test_show_caja_reporta_corte_abierto_o_null(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/cajas/{$caja->id}");
        $resp->assertOk()->assertJsonPath('data.corte_abierto', null);

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 100])
            ->assertCreated();

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/cajas/{$caja->id}");
        $resp->assertOk();
        $this->assertNotNull($resp->json('data.corte_abierto'));
    }

    public function test_owner_no_puede_ver_caja_de_otro_local(): void
    {
        $cajaB = Caja::create(['local_id' => $this->localB->id, 'nombre' => 'Caja B']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/cajas/{$cajaB->id}");
        $this->assertContains($resp->getStatusCode(), [403, 404]);
    }

    public function test_cierre_de_cuenta_en_efectivo_se_reconcilia_en_el_corte_de_caja(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1']);
        $corteResp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 200]);
        $corteId = $corteResp->json('data.id');

        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 8']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        // Cierra la cuenta en efectivo, asociada a este corte.
        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 100, 'metodo_pago' => 'efectivo']],
                'corte_caja_id' => $corteId,
            ])->assertOk();

        // Esperado: 200 (inicial) + 100 (efectivo recibido) = 300.
        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cortes-caja/{$corteId}/cerrar", ['monto_contado' => 300]);

        $resp->assertOk();
        $this->assertSame('300.00', $resp->json('data.monto_esperado'));
        $this->assertSame('0.00', $resp->json('data.varianza'));
    }

    public function test_pago_con_tarjeta_no_se_cuenta_en_la_reconciliacion_de_efectivo(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1']);
        $corteResp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 200]);
        $corteId = $corteResp->json('data.id');

        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 9']);
        $this->crearPedidoEnMesa($mesa, 2); // $100
        $cuenta = CuentaMesa::where('mesa_id', $mesa->id)->first();

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/cerrar", [
                'pagos' => [['monto' => 100, 'metodo_pago' => 'tarjeta_tpv']],
                'corte_caja_id' => $corteId,
            ])->assertOk();

        // Tarjeta no mueve efectivo físico — esperado sigue siendo sólo el monto inicial.
        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cortes-caja/{$corteId}/cerrar", ['monto_contado' => 200]);

        $resp->assertOk();
        $this->assertSame('200.00', $resp->json('data.monto_esperado'));
    }

    public function test_no_se_puede_abrir_dos_cortes_en_la_misma_caja(): void
    {
        $caja = Caja::create(['local_id' => $this->localA->id, 'nombre' => 'Caja 1']);
        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 100])
            ->assertCreated();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cajas/{$caja->id}/abrir-corte", ['monto_inicial' => 100]);

        $resp->assertStatus(409);
    }
}
