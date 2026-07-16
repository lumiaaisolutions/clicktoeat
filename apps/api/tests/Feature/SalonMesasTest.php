<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\LlamadoMesero;
use App\Models\Local;
use App\Models\Mesa;
use App\Models\Piso;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * F102 — operación de salón (mesas/pisos/llamar mesero). Cubre aislamiento
 * multi-tenant (regla crítica CLAUDE.md #7) y el flujo público de mesa.
 */
class SalonMesasTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected User $ownerB;

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
        $this->ownerB = User::create([
            'nombre' => 'Owner B', 'email' => 'owner@local-b.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->localB->id,
        ]);

        $categoria = Categoria::create([
            'local_id' => $this->localA->id, 'nombre' => 'Tacos', 'slug' => 'tacos', 'orden' => 0, 'activo' => true,
        ]);
        $this->productoA = Producto::create([
            'local_id' => $this->localA->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 20, 'disponible' => true,
        ]);
    }

    public function test_owner_crea_piso_y_mesa_para_su_local(): void
    {
        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/pisos', ['nombre' => 'Planta baja']);
        $resp->assertCreated();
        $pisoId = $resp->json('data.id');

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/mesas', ['piso_id' => $pisoId, 'etiqueta' => 'Mesa 1']);
        $resp->assertCreated()->assertJsonPath('data.etiqueta', 'Mesa 1');

        $this->assertDatabaseHas('mesas', ['etiqueta' => 'Mesa 1', 'local_id' => $this->localA->id]);
    }

    public function test_owner_no_puede_asignar_mesa_a_piso_de_otro_local(): void
    {
        $pisoB = Piso::create(['local_id' => $this->localB->id, 'nombre' => 'Piso B', 'orden' => 0]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/mesas', ['piso_id' => $pisoB->id, 'etiqueta' => 'Mesa colada']);

        $resp->assertStatus(422);
        $this->assertDatabaseMissing('mesas', ['etiqueta' => 'Mesa colada']);
    }

    public function test_owner_no_ve_mesas_de_otro_local(): void
    {
        Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B1']);
        Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa A1']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/mesas');

        $resp->assertOk();
        $etiquetas = collect($resp->json('data'))->pluck('etiqueta')->all();
        $this->assertContains('Mesa A1', $etiquetas);
        $this->assertNotContains('Mesa B1', $etiquetas);
    }

    public function test_owner_no_puede_editar_mesa_de_otro_local(): void
    {
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B1']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->patchJson("/api/v1/mesas/{$mesaB->id}", ['etiqueta' => 'Hackeada']);

        // 404 si el route-model-binding + scope global la filtró, 403 si la policy la bloqueó.
        $this->assertContains($resp->getStatusCode(), [403, 404]);
        $this->assertDatabaseHas('mesas', ['id' => $mesaB->id, 'etiqueta' => 'Mesa B1']);
    }

    public function test_publico_puede_ver_mesa_por_qr_token(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 3']);

        $resp = $this->getJson("/api/v1/public/mesa/{$mesa->qr_token}");

        $resp->assertOk()
            ->assertJsonPath('data.etiqueta', 'Mesa 3')
            ->assertJsonPath('data.localSlug', 'local-a');
    }

    public function test_publico_qr_token_inexistente_da_404(): void
    {
        $this->getJson('/api/v1/public/mesa/token-invalido')->assertNotFound();
    }

    public function test_cliente_en_mesa_crea_pedido_sin_login(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 5']);

        $resp = $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/pedidos", [
            'cliente' => ['nombre' => 'Juan'],
            'items' => [['producto_id' => $this->productoA->id, 'cantidad' => 2]],
        ]);

        $resp->assertCreated();
        $this->assertDatabaseHas('pedidos', [
            'mesa_id' => $mesa->id,
            'local_id' => $this->localA->id,
            'metodo_entrega' => 'sucursal',
        ]);
    }

    public function test_pedido_de_mesa_no_puede_usar_producto_de_otro_local(): void
    {
        $categoriaB = Categoria::create([
            'local_id' => $this->localB->id, 'nombre' => 'Pizzas', 'slug' => 'pizzas', 'orden' => 0, 'activo' => true,
        ]);
        $productoB = Producto::create([
            'local_id' => $this->localB->id, 'categoria_id' => $categoriaB->id,
            'nombre' => 'Pizza', 'slug' => 'pizza', 'precio' => 100, 'disponible' => true,
        ]);
        $mesaA = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 7']);

        $resp = $this->postJson("/api/v1/public/mesa/{$mesaA->qr_token}/pedidos", [
            'items' => [['producto_id' => $productoB->id, 'cantidad' => 1]],
        ]);

        $resp->assertStatus(500); // RuntimeException de OrderService — no debe crear el pedido
        $this->assertDatabaseMissing('pedidos', ['mesa_id' => $mesaA->id]);
    }

    public function test_cliente_llama_al_mesero(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 9']);

        $resp = $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/llamar-mesero");

        $resp->assertCreated();
        $this->assertDatabaseHas('llamados_mesero', ['mesa_id' => $mesa->id, 'atendido_at' => null]);
    }

    public function test_mesero_atiende_llamado_de_su_local_no_del_ajeno(): void
    {
        $mesaA = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 10']);
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa 10']);
        $llamadoA = LlamadoMesero::create(['local_id' => $this->localA->id, 'mesa_id' => $mesaA->id]);
        $llamadoB = LlamadoMesero::create(['local_id' => $this->localB->id, 'mesa_id' => $mesaB->id]);

        $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/salon/llamados/{$llamadoA->id}/atender")
            ->assertOk();

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/salon/llamados/{$llamadoB->id}/atender");
        $this->assertContains($resp->getStatusCode(), [403, 404]);

        $this->assertNotNull($llamadoA->fresh()->atendido_at);
        $this->assertNull($llamadoB->fresh()->atendido_at);
    }

    public function test_staff_con_permiso_cocina_ve_pedidos_de_mesa(): void
    {
        $cocinero = User::create([
            'nombre' => 'Cocinero', 'email' => 'cocina@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['cocina'],
        ]);
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 2']);
        $this->postJson("/api/v1/public/mesa/{$mesa->qr_token}/pedidos", [
            'items' => [['producto_id' => $this->productoA->id, 'cantidad' => 1]],
        ])->assertCreated();

        $resp = $this->actingAs($cocinero, 'sanctum')->getJson('/api/v1/salon/cocina/pedidos');

        $resp->assertOk();
        $this->assertCount(1, $resp->json('data'));
    }
}
