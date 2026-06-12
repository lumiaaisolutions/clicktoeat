<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffCrudTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->local = Local::factory()->create();
        $this->owner = User::factory()->owner($this->local)->create();
    }

    /** @test */
    public function owner_lista_solo_usuarios_de_su_local(): void
    {
        User::factory()->staff($this->local)->count(3)->create();
        $otroLocal = Local::factory()->create();
        User::factory()->staff($otroLocal)->count(2)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/local/staff')->assertOk();

        // 4 = 3 staff del local + el owner mismo
        $this->assertCount(4, $resp->json('data'));
    }

    /** @test */
    public function owner_crea_un_staff_para_su_local(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson('/api/v1/local/staff', [
            'nombre'                => 'Juan Empleado',
            'email'                 => 'juan@empleado.com',
            'password'              => 'staff-pass-123',
            'password_confirmation' => 'staff-pass-123',
        ])->assertCreated();

        $resp->assertJsonPath('data.email', 'juan@empleado.com')
             ->assertJsonPath('data.rol', 'staff')
             ->assertJsonPath('data.local_id', $this->local->id);

        $this->assertDatabaseHas('users', [
            'email'    => 'juan@empleado.com',
            'rol'      => 'staff',
            'local_id' => $this->local->id,
        ]);

        $staff = User::where('email', 'juan@empleado.com')->first();
        $this->assertTrue(Hash::check('staff-pass-123', $staff->password));
    }

    /** @test */
    public function staff_no_puede_crear_otros_staff(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson('/api/v1/local/staff', [
            'nombre'                => 'X',
            'email'                 => 'x@y.com',
            'password'              => 'pass-pass-123',
            'password_confirmation' => 'pass-pass-123',
        ])->assertStatus(403);
    }

    /** @test */
    public function owner_no_puede_crear_otro_owner_via_endpoint_staff(): void
    {
        // El controller hardcodea rol='staff' — un payload con rol distinto se ignora.
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/local/staff', [
            'nombre'                => 'Otro owner',
            'email'                 => 'otro@owner.com',
            'password'              => 'pass-pass-123',
            'password_confirmation' => 'pass-pass-123',
            'rol'                   => 'owner',   // intento de inyección
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'otro@owner.com',
            'rol'   => 'staff',   // se hardcodea
        ]);
    }

    /** @test */
    public function owner_actualiza_nombre_y_email_de_su_staff(): void
    {
        $staff = User::factory()->staff($this->local)->create(['nombre' => 'Viejo']);
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$staff->id}", [
            'nombre' => 'Nuevo nombre',
            'email'  => 'nuevo@email.com',
        ])->assertOk()
          ->assertJsonPath('data.nombre', 'Nuevo nombre')
          ->assertJsonPath('data.email',  'nuevo@email.com');
    }

    /** @test */
    public function owner_resetea_password_de_staff_e_invalida_sus_sesiones(): void
    {
        $staff = User::factory()->staff($this->local)->create(['password' => Hash::make('vieja-123')]);
        $staff->createToken('a');
        $staff->createToken('b');
        $this->assertSame(2, $staff->tokens()->count());

        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$staff->id}", [
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertOk();

        $this->assertTrue(Hash::check('nueva-segura-456', $staff->fresh()->password));
        $this->assertSame(0, $staff->tokens()->count());
    }

    /** @test */
    public function owner_no_puede_editarse_a_si_mismo_via_staff(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$this->owner->id}", [
            'nombre' => 'Hijack',
        ])->assertStatus(403);
    }

    /** @test */
    public function owner_no_puede_editar_a_otro_owner_del_mismo_local(): void
    {
        // Edge case raro pero posible si por error hay 2 owners del mismo local
        $otroOwner = User::factory()->owner($this->local)->create();
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$otroOwner->id}", [
            'nombre' => 'Hijack',
        ])->assertStatus(403);
    }

    /** @test */
    public function owner_no_puede_editar_staff_de_otro_local(): void
    {
        $otroLocal = Local::factory()->create();
        $staff     = User::factory()->staff($otroLocal)->create();

        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$staff->id}", [
            'nombre' => 'Hijack',
        ])->assertStatus(403);
    }

    /** @test */
    public function owner_borra_staff_soft_delete_y_corta_sesiones(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        $staff->createToken('a');

        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/local/staff/{$staff->id}")->assertNoContent();

        $this->assertSoftDeleted('users', ['id' => $staff->id]);
        $this->assertSame(0, $staff->tokens()->count());
    }

    /** @test */
    public function rechaza_email_duplicado_al_crear(): void
    {
        User::factory()->create(['email' => 'duplicado@example.com']);
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/local/staff', [
            'nombre'                => 'X',
            'email'                 => 'duplicado@example.com',
            'password'              => 'staff-pass-123',
            'password_confirmation' => 'staff-pass-123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }
}
