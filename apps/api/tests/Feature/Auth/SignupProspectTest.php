<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El alta de cuenta (signup-prospect) debe marcar el email como verificado.
 * Regresión: `email_verified_at` no estaba en User::$fillable → en prod se
 * descartaba silencioso (usuario sin verificar) y en dev lanzaba 500.
 */
class SignupProspectTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function el_alta_crea_el_usuario_con_email_verificado(): void
    {
        $resp = $this->postJson('/api/v1/auth/signup-prospect', [
            'nombre' => 'Nuevo Dueño',
            'email' => 'nuevo@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
        ]);

        $resp->assertCreated();

        $user = User::where('email', 'nuevo@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at, 'El alta debe marcar el email como verificado.');
        $this->assertSame('owner', $user->rol);
    }
}
