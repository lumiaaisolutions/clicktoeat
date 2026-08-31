<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\DetallePedido;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase E del roadmap de salón (docs/features/salon-roadmap.md): KDS por ítem.
 * Marcar una línea lista/pendiente, con aislamiento multi-tenant.
 */
class SalonKdsItemTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $cocineroA;

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
        $this->cocineroA = User::create([
            'nombre' => 'Cocinero', 'email' => 'cocina@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['cocina'],
        ]);
    }

    private function pedidoConItem(Local $local): DetallePedido
    {
        $cat = Categoria::create(['local_id' => $local->id, 'nombre' => 'C', 'slug' => 'c-'.$local->id, 'orden' => 0, 'activo' => true]);
        $prod = Producto::create(['local_id' => $local->id, 'categoria_id' => $cat->id, 'nombre' => 'P', 'slug' => 'p-'.$local->id, 'precio' => 20, 'disponible' => true]);
        $mesa = Mesa::create(['local_id' => $local->id, 'etiqueta' => 'M'.$local->id]);
        $pedido = Pedido::create([
            'local_id' => $local->id, 'codigo' => 'CE-'.strtoupper(substr(md5((string) mt_rand()), 0, 6)),
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215500000000', 'whatsapp_url' => 'https://wa.me/x',
            'mesa_id' => $mesa->id, 'metodo_entrega' => 'sucursal', 'metodo_pago' => 'efectivo',
            'estado' => 'preparando', 'subtotal' => 20, 'total' => 20,
        ]);

        return DetallePedido::create([
            'pedido_id' => $pedido->id, 'producto_id' => $prod->id, 'producto_nombre' => 'P',
            'precio_unitario' => 20, 'cantidad' => 1, 'subtotal' => 20,
        ]);
    }

    public function test_cocinero_marca_item_listo(): void
    {
        $detalle = $this->pedidoConItem($this->localA);

        $this->actingAs($this->cocineroA, 'sanctum')
            ->patchJson("/api/v1/detalle-pedidos/{$detalle->id}/estado", ['estado' => 'listo'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'listo');

        $this->assertDatabaseHas('detalle_pedidos', ['id' => $detalle->id, 'estado' => 'listo']);
    }

    public function test_item_nace_pendiente(): void
    {
        $detalle = $this->pedidoConItem($this->localA);
        $this->assertSame('pendiente', $detalle->fresh()->estado);
    }

    public function test_no_se_puede_marcar_item_de_otro_local(): void
    {
        $detalleB = $this->pedidoConItem($this->localB);

        $resp = $this->actingAs($this->cocineroA, 'sanctum')
            ->patchJson("/api/v1/detalle-pedidos/{$detalleB->id}/estado", ['estado' => 'listo']);

        $resp->assertStatus(404);
        $this->assertDatabaseHas('detalle_pedidos', ['id' => $detalleB->id, 'estado' => 'pendiente']);
    }

    public function test_estado_invalido_es_rechazado(): void
    {
        $detalle = $this->pedidoConItem($this->localA);
        $this->actingAs($this->cocineroA, 'sanctum')
            ->patchJson("/api/v1/detalle-pedidos/{$detalle->id}/estado", ['estado' => 'quemado'])
            ->assertStatus(422);
    }
}
