<?php

namespace Tests\Feature\Auth;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_cambia_su_propia_password_con_credencial_actual(): void
    {
        $user = User::factory()->create(['password' => Hash::make('actual123')]);

        Sanctum::actingAs($user, ['*']);

        $this->patchJson('/api/v1/auth/me/password', [
            'current_password'      => 'actual123',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertOk();

        $this->assertTrue(Hash::check('nueva-segura-456', $user->fresh()->password));
    }

    /** @test */
    public function rechaza_cambio_con_current_password_incorrecto(): void
    {
        $user = User::factory()->create(['password' => Hash::make('actual123')]);
        Sanctum::actingAs($user, ['*']);

        $this->patchJson('/api/v1/auth/me/password', [
            'current_password'      => 'incorrecta',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('actual123', $user->fresh()->password));
    }

    /** @test */
    public function cambio_propio_invalida_otros_tokens_no_el_actual(): void
    {
        $user = User::factory()->create(['password' => Hash::make('actual123')]);

        $tokenA = $user->createToken('device-a')->plainTextToken;
        $tokenB = $user->createToken('device-b')->plainTextToken;
        $tokenC = $user->createToken('device-c')->plainTextToken;

        $this->assertSame(3, $user->tokens()->count());

        // Cambiamos password con tokenB
        $this->withHeader('Authorization', "Bearer {$tokenB}")
             ->patchJson('/api/v1/auth/me/password', [
                 'current_password'      => 'actual123',
                 'password'              => 'nueva-segura-456',
                 'password_confirmation' => 'nueva-segura-456',
             ])->assertOk();

        // Sólo el token actual sobrevive
        $this->assertSame(1, $user->tokens()->count());

        // tokenB sigue vivo
        $this->withHeader('Authorization', "Bearer {$tokenB}")
             ->getJson('/api/v1/auth/me')
             ->assertOk();

        // tokenA y tokenC NO sirven
        $this->withHeader('Authorization', "Bearer {$tokenA}")
             ->getJson('/api/v1/auth/me')
             ->assertStatus(401);

        $this->withHeader('Authorization', "Bearer {$tokenC}")
             ->getJson('/api/v1/auth/me')
             ->assertStatus(401);
    }

    /** @test */
    public function super_admin_resetea_password_del_owner_de_un_local(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $local      = Local::factory()->create();
        $owner      = User::factory()->owner($local)->create(['password' => Hash::make('vieja123')]);

        Sanctum::actingAs($superAdmin, ['*']);

        $this->patchJson("/api/v1/admin/locales/{$local->id}/owner-password", [
            'password'              => 'reseteada-789',
            'password_confirmation' => 'reseteada-789',
        ])->assertOk()
          ->assertJsonPath('owner.email', $owner->email);

        $this->assertTrue(Hash::check('reseteada-789', $owner->fresh()->password));
    }

    /** @test */
    public function reset_por_super_admin_cierra_TODAS_las_sesiones_del_owner(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $local      = Local::factory()->create();
        $owner      = User::factory()->owner($local)->create();

        // Owner tiene 3 sesiones activas
        $owner->createToken('a');
        $owner->createToken('b');
        $owner->createToken('c');
        $this->assertSame(3, $owner->tokens()->count());

        Sanctum::actingAs($superAdmin, ['*']);

        $this->patchJson("/api/v1/admin/locales/{$local->id}/owner-password", [
            'password'              => 'reseteada-789',
            'password_confirmation' => 'reseteada-789',
        ])->assertOk();

        // Todas las sesiones del owner se cierran
        $this->assertSame(0, $owner->tokens()->count());
    }

    /** @test */
    public function owner_no_puede_resetear_password_de_otro_owner(): void
    {
        $local      = Local::factory()->create();
        $owner      = User::factory()->owner($local)->create();
        $otroLocal  = Local::factory()->create();

        Sanctum::actingAs($owner, ['*']);

        $this->patchJson("/api/v1/admin/locales/{$otroLocal->id}/owner-password", [
            'password'              => 'hijacked-789',
            'password_confirmation' => 'hijacked-789',
        ])->assertStatus(403);
    }

    /** @test */
    public function reset_falla_404_si_el_local_no_tiene_owner(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $local      = Local::factory()->create();   // sin owner asociado

        Sanctum::actingAs($superAdmin, ['*']);

        $this->patchJson("/api/v1/admin/locales/{$local->id}/owner-password", [
            'password'              => 'cualquiera-789',
            'password_confirmation' => 'cualquiera-789',
        ])->assertStatus(404);
    }
}
