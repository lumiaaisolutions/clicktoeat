<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\MesaEvento;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase B del roadmap de salón (docs/features/salon-roadmap.md): historial de
 * cambios de mesa. Verifica que se registran los eventos y su aislamiento tenant.
 */
class SalonMesaHistorialTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected User $meseroA;

    protected Producto $productoA;

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
        $this->meseroA = User::create([
            'nombre' => 'Mesero Uno', 'email' => 'mesero1@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['mesero'],
        ]);
        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->productoA = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 20, 'disponible' => true,
        ]);
    }

    public function test_tomar_mesa_registra_evento_con_usuario(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);

        $this->actingAs($this->meseroA, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/tomar")->assertOk();

        $this->assertDatabaseHas('mesa_eventos', [
            'mesa_id' => $mesa->id, 'tipo' => 'tomada', 'user_id' => $this->meseroA->id,
        ]);
    }

    public function test_pedido_de_mesa_registra_ocupada_y_pedido_agregado(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 2']);

        $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/pedidos", [
            'items' => [['producto_id' => $this->productoA->id, 'cantidad' => 1]],
        ])->assertCreated();

        $this->assertDatabaseHas('mesa_eventos', ['mesa_id' => $mesa->id, 'tipo' => 'estado_cambio', 'estado_nuevo' => 'ocupada']);
        $this->assertDatabaseHas('mesa_eventos', ['mesa_id' => $mesa->id, 'tipo' => 'pedido_agregado']);
    }

    public function test_show_devuelve_el_historial(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 3']);
        $this->actingAs($this->meseroA, 'sanctum')->postJson("/api/v1/mesas/{$mesa->id}/tomar")->assertOk();

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/mesas/{$mesa->id}");

        $resp->assertOk();
        $eventos = $resp->json('data.eventos');
        $this->assertNotEmpty($eventos);
        $this->assertSame('tomada', $eventos[0]['tipo']);
        $this->assertSame('Mesero Uno', $eventos[0]['usuario']);
    }

    public function test_no_se_puede_ver_historial_de_mesa_de_otro_local(): void
    {
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B']);
        MesaEvento::create(['local_id' => $this->localB->id, 'mesa_id' => $mesaB->id, 'tipo' => 'tomada']);

        // El owner del local A no puede abrir el detalle (ni el historial) de una mesa del local B.
        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/mesas/{$mesaB->id}");
        $this->assertContains($resp->getStatusCode(), [403, 404]);
    }
}
