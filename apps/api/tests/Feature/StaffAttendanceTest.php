<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\StaffAttendance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * F102 — registro de asistencia (clock-in/out) de staff, ver
 * docs/features/plan-499-operacion-salon-implementacion.md Fase 2.4.
 */
class StaffAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected Local $localA;

    protected Local $localB;

    protected User $ownerA;

    protected User $cocineroA;

    protected User $meseroA;

    protected User $ownerB;

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
        $this->cocineroA = User::create([
            'nombre' => 'Cocinero A', 'email' => 'cocinero@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['cocina'],
        ]);
        $this->meseroA = User::create([
            'nombre' => 'Mesero A', 'email' => 'mesero@local-a.local', 'password' => Hash::make('password123'),
            'rol' => 'staff', 'local_id' => $this->localA->id, 'permisos' => ['mesero'],
        ]);
        $this->ownerB = User::create([
            'nombre' => 'Owner B', 'email' => 'owner@local-b.local', 'password' => Hash::make('password123'),
            'rol' => 'owner', 'local_id' => $this->localB->id,
        ]);
    }

    public function test_staff_registra_entrada(): void
    {
        $resp = $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/entrada');

        $resp->assertCreated();
        $this->assertDatabaseHas('staff_attendances', [
            'user_id' => $this->cocineroA->id,
            'local_id' => $this->localA->id,
            'salida' => null,
        ]);
    }

    public function test_no_puede_registrar_dos_entradas_seguidas(): void
    {
        $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/entrada')->assertCreated();
        $resp = $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/entrada');

        $resp->assertStatus(409);
        $this->assertSame(1, StaffAttendance::query()->where('user_id', $this->cocineroA->id)->count());
    }

    public function test_registra_salida_y_calcula_horas(): void
    {
        $entrada = StaffAttendance::create([
            'local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id,
            'entrada' => now()->subHours(3),
        ]);

        $resp = $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/salida');

        $resp->assertOk();
        $resp->assertJsonPath('data.id', $entrada->id);
        $this->assertNotNull($resp->json('data.horas'));
        $this->assertEqualsWithDelta(3.0, (float) $resp->json('data.horas'), 0.05);
        $this->assertDatabaseHas('staff_attendances', ['id' => $entrada->id]);
        $this->assertNotNull($entrada->fresh()->salida);
    }

    public function test_no_puede_registrar_salida_sin_entrada_abierta(): void
    {
        $resp = $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/salida');
        $resp->assertStatus(409);
    }

    public function test_estado_refleja_entrada_abierta(): void
    {
        $resp = $this->actingAs($this->cocineroA, 'sanctum')->getJson('/api/v1/asistencias/estado');
        $resp->assertOk()->assertJsonPath('data.abierta', null);

        $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/entrada')->assertCreated();

        $resp = $this->actingAs($this->cocineroA, 'sanctum')->getJson('/api/v1/asistencias/estado');
        $resp->assertOk();
        $this->assertNotNull($resp->json('data.abierta'));
    }

    public function test_staff_solo_ve_sus_propios_registros(): void
    {
        StaffAttendance::create(['local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id, 'entrada' => now()->subHour()]);
        StaffAttendance::create(['local_id' => $this->localA->id, 'user_id' => $this->meseroA->id, 'entrada' => now()->subHour()]);

        $resp = $this->actingAs($this->cocineroA, 'sanctum')->getJson('/api/v1/asistencias');

        $resp->assertOk();
        $data = $resp->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($this->cocineroA->id, $data[0]['user_id']);
    }

    public function test_owner_ve_todos_los_registros_del_local(): void
    {
        StaffAttendance::create(['local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id, 'entrada' => now()->subHour()]);
        StaffAttendance::create(['local_id' => $this->localA->id, 'user_id' => $this->meseroA->id, 'entrada' => now()->subHour()]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->getJson('/api/v1/asistencias');

        $resp->assertOk();
        $this->assertCount(2, $resp->json('data'));
    }

    public function test_owner_no_ve_registros_de_otro_local(): void
    {
        StaffAttendance::create(['local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id, 'entrada' => now()->subHour()]);

        $resp = $this->actingAs($this->ownerB, 'sanctum')->getJson('/api/v1/asistencias');

        $resp->assertOk();
        $this->assertCount(0, $resp->json('data'));
    }

    public function test_staff_no_puede_cerrar_o_borrar_registro_ajeno(): void
    {
        $registro = StaffAttendance::create([
            'local_id' => $this->localA->id, 'user_id' => $this->meseroA->id, 'entrada' => now()->subHour(),
        ]);

        // El cocinero no tiene una entrada abierta propia -> 409, no puede tocar la del mesero.
        $this->actingAs($this->cocineroA, 'sanctum')->postJson('/api/v1/asistencias/salida')->assertStatus(409);

        $resp = $this->actingAs($this->cocineroA, 'sanctum')->deleteJson("/api/v1/asistencias/{$registro->id}");
        $resp->assertForbidden();
    }

    public function test_owner_puede_borrar_registro_para_correccion(): void
    {
        $registro = StaffAttendance::create([
            'local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id, 'entrada' => now()->subHour(),
        ]);

        $resp = $this->actingAs($this->ownerA, 'sanctum')->deleteJson("/api/v1/asistencias/{$registro->id}");

        $resp->assertNoContent();
        $this->assertDatabaseMissing('staff_attendances', ['id' => $registro->id]);
    }

    public function test_usuario_de_otro_local_no_puede_borrar_registro_ajeno(): void
    {
        $registro = StaffAttendance::create([
            'local_id' => $this->localA->id, 'user_id' => $this->cocineroA->id, 'entrada' => now()->subHour(),
        ]);

        $resp = $this->actingAs($this->ownerB, 'sanctum')->deleteJson("/api/v1/asistencias/{$registro->id}");

        $resp->assertForbidden();
        $this->assertDatabaseHas('staff_attendances', ['id' => $registro->id]);
    }
}
