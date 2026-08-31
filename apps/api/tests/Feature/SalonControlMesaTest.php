<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\Mesa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase A del roadmap de salón (docs/features/salon-roadmap.md): control de mesa
 * — quién atiende, tomar/liberar exclusivo. Cubre aislamiento multi-tenant
 * (regla CLAUDE.md #7) y la exclusividad del "tomar control".
 */
class SalonControlMesaTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected User $meseroA;

    protected User $mesero2A;

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
        $this->mesero2A = User::create([
            'nombre' => 'Mesero Dos', 'email' => 'mesero2@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['mesero'],
        ]);
    }

    public function test_mesero_toma_control_de_mesa_de_su_local(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 1']);

        $resp = $this->actingAs($this->meseroA, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/tomar");

        $resp->assertOk()
            ->assertJsonPath('data.atendido_por', $this->meseroA->id)
            ->assertJsonPath('data.atiende', 'Mesero Uno');
        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'atendido_por' => $this->meseroA->id]);
    }

    public function test_otro_mesero_no_puede_tomar_mesa_ya_atendida(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 2', 'atendido_por' => $this->meseroA->id]);

        $resp = $this->actingAs($this->mesero2A, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/tomar");

        $resp->assertStatus(409);
        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'atendido_por' => $this->meseroA->id]);
    }

    public function test_owner_puede_reasignar_mesa_ya_atendida(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 3', 'atendido_por' => $this->meseroA->id]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/tomar");

        $resp->assertOk()->assertJsonPath('data.atendido_por', $this->ownerA->id);
    }

    public function test_mesero_asignado_libera_su_mesa(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 4', 'atendido_por' => $this->meseroA->id]);

        $this->actingAs($this->meseroA, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/liberar")
            ->assertOk();

        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'atendido_por' => null]);
    }

    public function test_mesero_no_asignado_no_puede_liberar_mesa_ajena(): void
    {
        $mesa = Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 5', 'atendido_por' => $this->meseroA->id]);

        $resp = $this->actingAs($this->mesero2A, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesa->id}/liberar");

        $resp->assertForbidden();
        $this->assertDatabaseHas('mesas', ['id' => $mesa->id, 'atendido_por' => $this->meseroA->id]);
    }

    public function test_owner_no_puede_tomar_mesa_de_otro_local(): void
    {
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/mesas/{$mesaB->id}/tomar");

        $this->assertContains($resp->getStatusCode(), [403, 404]);
        $this->assertDatabaseHas('mesas', ['id' => $mesaB->id, 'atendido_por' => null]);
    }

    public function test_index_expone_quien_atiende(): void
    {
        Mesa::create(['local_id' => $this->localA->id, 'etiqueta' => 'Mesa 6', 'atendido_por' => $this->meseroA->id]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/mesas');

        $resp->assertOk();
        $mesa = collect($resp->json('data'))->firstWhere('etiqueta', 'Mesa 6');
        $this->assertSame('Mesero Uno', $mesa['atiende']);
    }

    public function test_show_no_filtra_datos_de_otro_local(): void
    {
        $mesaB = Mesa::create(['local_id' => $this->localB->id, 'etiqueta' => 'Mesa B2']);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson("/api/v1/mesas/{$mesaB->id}");

        $this->assertContains($resp->getStatusCode(), [403, 404]);
    }
}
