<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function forgot_password_envia_email_si_existe(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'existe@example.com']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'existe@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'Si el email existe, recibirás un enlace para restablecer tu contraseña.');

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    /** @test */
    public function forgot_password_no_revela_si_email_no_existe(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'noexiste@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'Si el email existe, recibirás un enlace para restablecer tu contraseña.');

        Notification::assertNothingSent();
    }

    /** @test */
    public function forgot_password_valida_email(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'no-es-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    /** @test */
    public function reset_con_token_valido_cambia_password(): void
    {
        $user  = User::factory()->create([
            'email'    => 'user@example.com',
            'password' => Hash::make('vieja123'),
        ]);

        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token'                 => $token,
            'email'                 => 'user@example.com',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertOk()
          ->assertJsonPath('message', 'Contraseña restablecida correctamente. Inicia sesión.');

        $this->assertTrue(Hash::check('nueva-segura-456', $user->fresh()->password));
    }

    /** @test */
    public function reset_invalida_TODAS_las_sesiones_del_user(): void
    {
        $user = User::factory()->create(['password' => Hash::make('vieja123')]);

        // User tiene 3 sesiones activas
        $user->createToken('a');
        $user->createToken('b');
        $user->createToken('c');
        $this->assertSame(3, $user->tokens()->count());

        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token'                 => $token,
            'email'                 => $user->email,
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertOk();

        // Todas las sesiones cerradas
        $this->assertSame(0, $user->fresh()->tokens()->count());
    }

    /** @test */
    public function reset_con_token_invalido_devuelve_422(): void
    {
        User::factory()->create(['email' => 'user@example.com', 'password' => Hash::make('vieja123')]);

        $this->postJson('/api/v1/auth/reset-password', [
            'token'                 => 'token-falso',
            'email'                 => 'user@example.com',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertStatus(422);
    }

    /** @test */
    public function reset_con_email_inexistente_devuelve_422(): void
    {
        $this->postJson('/api/v1/auth/reset-password', [
            'token'                 => 'cualquiera',
            'email'                 => 'no-existe@example.com',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertStatus(422);
    }

    /** @test */
    public function reset_con_password_mismatch_falla_422(): void
    {
        $user  = User::factory()->create();
        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token'                 => $token,
            'email'                 => $user->email,
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'distinta-789',
        ])->assertStatus(422)
          ->assertJsonValidationErrors('password');
    }
}
