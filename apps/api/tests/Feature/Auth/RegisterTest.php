<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function un_usuario_se_registra_como_owner_sin_local(): void
    {
        $resp = $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'María Pérez',
            'email'                 => 'maria@example.com',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $resp->assertCreated()
             ->assertJsonStructure(['user' => ['id', 'nombre', 'email', 'rol', 'local_id'], 'token']);

        $this->assertDatabaseHas('users', [
            'email'    => 'maria@example.com',
            'rol'      => 'owner',
            'local_id' => null,
        ]);

        $user = User::where('email', 'maria@example.com')->first();
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    /** @test */
    public function rechaza_email_duplicado(): void
    {
        User::factory()->create(['email' => 'duplicado@example.com']);

        $resp = $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'X',
            'email'                 => 'duplicado@example.com',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $resp->assertStatus(422)->assertJsonValidationErrors('email');
    }

    /** @test */
    public function rechaza_password_corta_o_sin_numero(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'X',
            'email'                 => 'a@b.com',
            'password'              => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'X',
            'email'                 => 'a@b.com',
            'password'              => 'sinnumerolargo',
            'password_confirmation' => 'sinnumerolargo',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    /** @test */
    public function rechaza_password_confirmation_distinta(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'X',
            'email'                 => 'a@b.com',
            'password'              => 'secret123',
            'password_confirmation' => 'distinta-456',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    /** @test */
    public function el_token_devuelto_es_funcional(): void
    {
        $resp = $this->postJson('/api/v1/auth/register', [
            'nombre'                => 'María',
            'email'                 => 'maria@example.com',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $token = $resp->json('token');
        $this->assertNotEmpty($token);

        $this->withHeader('Authorization', "Bearer {$token}")
             ->getJson('/api/v1/auth/me')
             ->assertOk()
             ->assertJsonPath('user.email', 'maria@example.com');
    }
}
