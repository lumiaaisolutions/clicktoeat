<?php

namespace Tests\Feature;

use App\Models\CuentaMesa;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\User;
use App\Services\Salon\CuentaMesaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase G del roadmap de salón (docs/features/salon-roadmap.md): transferir y
 * unir cuentas de mesa + estados ricos. Con aislamiento multi-tenant.
 */
class SalonTransferirUnirTest extends TestCase
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

    private function cuentaConMesa(Local $local, string $etiqueta, float $total = 100): CuentaMesa
    {
        $mesa = Mesa::create(['local_id' => $local->id, 'etiqueta' => $etiqueta, 'estado' => 'ocupada']);
        $cuenta = CuentaMesa::create(['local_id' => $local->id, 'mesa_id' => $mesa->id, 'estado' => 'abierta']);
        Pedido::create([
            'local_id' => $local->id, 'codigo' => 'CE-'.strtoupper(substr(md5((string) mt_rand()), 0, 6)),
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215500000000', 'whatsapp_url' => 'https://wa.me/x',
            'mesa_id' => $mesa->id, 'cuenta_mesa_id' => $cuenta->id, 'metodo_entrega' => 'sucursal',
            'metodo_pago' => 'efectivo', 'estado' => 'preparando', 'subtotal' => $total, 'total' => $total,
        ]);

        return $cuenta->fresh();
    }

    public function test_transferir_cuenta_a_mesa_libre(): void
    {
        $cuenta = $this->cuentaConMesa($this->localA, 'Mesa 1');
        $origen = $cuenta->mesa;
        $destino = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 2', 'estado' => 'libre']);

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/transferir", ['mesa_destino_id' => $destino->id])
            ->assertOk();

        $this->assertDatabaseHas('cuentas_mesa', ['id' => $cuenta->id, 'mesa_id' => $destino->id]);
        $this->assertDatabaseHas('mesas', ['id' => $destino->id, 'estado' => 'ocupada']);
        $this->assertDatabaseHas('mesas', ['id' => $origen->id, 'estado' => 'libre']);
    }

    public function test_no_se_puede_transferir_a_mesa_ocupada(): void
    {
        $cuenta = $this->cuentaConMesa($this->localA, 'Mesa 1');
        $otra = $this->cuentaConMesa($this->localA, 'Mesa 2'); // su mesa queda ocupada

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuenta->id}/transferir", ['mesa_destino_id' => $otra->mesa_id]);

        $resp->assertStatus(409);
    }

    public function test_unir_dos_cuentas_mueve_pedidos_y_libera_mesa_origen(): void
    {
        $destino = $this->cuentaConMesa($this->localA, 'Mesa 1', 100);
        $origen = $this->cuentaConMesa($this->localA, 'Mesa 2', 60);
        $mesaOrigen = $origen->mesa;

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$destino->id}/unir", ['cuenta_origen_id' => $origen->id])
            ->assertOk();

        // Los 2 pedidos quedan en la cuenta destino; la origen cerrada y su mesa libre.
        $this->assertSame(2, Pedido::withoutGlobalScopes()->where('cuenta_mesa_id', $destino->id)->count());
        $this->assertDatabaseHas('cuentas_mesa', ['id' => $origen->id, 'estado' => 'cerrada']);
        $this->assertDatabaseHas('mesas', ['id' => $mesaOrigen->id, 'estado' => 'libre']);
        $this->assertEquals(160.0, (float) $destino->fresh()->subtotal);
    }

    public function test_no_se_puede_transferir_cuenta_de_otro_local(): void
    {
        $cuentaB = $this->cuentaConMesa($this->localB, 'Mesa B');
        $destino = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa A', 'estado' => 'libre']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/cuentas-mesa/{$cuentaB->id}/transferir", ['mesa_destino_id' => $destino->id]);

        $this->assertContains($resp->getStatusCode(), [403, 404]);
    }

    public function test_mesa_acepta_estado_reservada(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa X']);

        $this->actingAs($this->ownerA, 'sanctum')
            ->patchJson("/api/v1/mesas/{$mesa->id}", ['estado' => 'reservada'])
            ->assertOk();

        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'estado' => 'reservada']);
    }
}
