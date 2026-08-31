<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Fase F del roadmap de salón (docs/features/salon-roadmap.md): middleware
 * `permiso` central. El staff sólo entra a su zona; el dueño a todas.
 */
class SalonPermisosTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;

    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Local', 'slug' => 'local', 'whatsapp' => '5215500000001',
            'color_primario' => '#5C64B8', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Outfit', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'owner@local.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->local->id,
        ]);
    }

    private function staff(array $permisos): User
    {
        return User::create([
            'nombre' => 'Staff '.implode('', $permisos), 'email' => 'staff-'.implode('', $permisos).'@local.local',
            'password' => Hash::make('password123'), 'rol' => 'staff', 'local_id' => $this->local->id, 'permisos' => $permisos,
        ]);
    }

    public function test_staff_sin_permiso_caja_no_entra_a_caja(): void
    {
        $this->actingAs($this->staff(['cocina']), 'sanctum')
            ->getJson('/api/v1/caja/pendientes')
            ->assertStatus(403)
            ->assertJsonPath('code', 'PERMISO_DENEGADO');
    }

    public function test_staff_con_permiso_caja_entra_a_caja(): void
    {
        $this->actingAs($this->staff(['caja']), 'sanctum')
            ->getJson('/api/v1/caja/pendientes')
            ->assertOk();
    }

    public function test_staff_sin_permiso_cocina_no_entra_a_cocina(): void
    {
        $this->actingAs($this->staff(['mesero']), 'sanctum')
            ->getJson('/api/v1/salon/cocina/pedidos')
            ->assertStatus(403);
    }

    public function test_staff_mesero_no_puede_tomar_por_zona_equivocada(): void
    {
        // mesero SÍ puede tomar; cocina NO.
        $this->actingAs($this->staff(['cocina']), 'sanctum')
            ->getJson('/api/v1/salon/mesero/pedidos')
            ->assertStatus(403);
    }

    public function test_owner_entra_a_todas_las_zonas(): void
    {
        $this->actingAs($this->owner, 'sanctum')->getJson('/api/v1/caja/pendientes')->assertOk();
        $this->actingAs($this->owner, 'sanctum')->getJson('/api/v1/salon/cocina/pedidos')->assertOk();
        $this->actingAs($this->owner, 'sanctum')->getJson('/api/v1/salon/mesero/pedidos')->assertOk();
    }
}
