<?php

namespace Tests\Feature\Auth;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // En testing el CACHE_STORE=array persiste entre tests del mismo proceso.
        // Limpio ambos: el throttle middleware del router (clave 'throttle|...')
        // y el RateLimiter manual del controller (clave 'login:ip:email').
        Cache::flush();
        RateLimiter::clear('login:127.0.0.1:owner@example.com');
    }

    /** @test */
    public function login_valido_devuelve_token_y_user(): void
    {
        $local = Local::factory()->create();
        $user  = User::factory()->owner($local)->create([
            'email'    => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $resp = $this->postJson('/api/v1/auth/login', [
            'email'    => 'owner@example.com',
            'password' => 'secret123',
            'device'   => 'phpunit',
        ]);

        $resp->assertOk()
             ->assertJsonStructure(['user' => ['id', 'nombre', 'email', 'rol', 'local_id'], 'token'])
             ->assertJsonPath('user.id', $user->id)
             ->assertJsonPath('user.rol', 'owner')
             ->assertJsonPath('user.local_id', $local->id);
    }

    /** @test */
    public function login_con_password_incorrecto_devuelve_422(): void
    {
        User::factory()->create([
            'email'    => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email'    => 'owner@example.com',
            'password' => 'incorrecta',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    /** @test */
    public function login_con_email_inexistente_devuelve_422(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'noexiste@example.com',
            'password' => 'cualquier',
        ])->assertStatus(422);
    }

    /** @test */
    public function throttle_bloquea_tras_5_intentos_fallidos_por_email(): void
    {
        User::factory()->create([
            'email'    => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        // 5 intentos fallidos
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email'    => 'owner@example.com',
                'password' => 'wrongpass',
            ])->assertStatus(422);
        }

        // El 6to intenta — debe ser 429 (throttle del controller)
        $resp = $this->postJson('/api/v1/auth/login', [
            'email'    => 'owner@example.com',
            'password' => 'wrongpass',
        ]);

        $resp->assertStatus(429);
        $this->assertStringContainsString('Demasiados intentos', $resp->json('errors.email.0'));
    }

    /** @test */
    public function login_exitoso_resetea_el_contador_de_throttle(): void
    {
        User::factory()->create([
            'email'    => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        // 4 fallos
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email'    => 'owner@example.com',
                'password' => 'wrongpass',
            ]);
        }

        // Éxito
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'owner@example.com',
            'password' => 'secret123',
        ])->assertOk();

        // Tras login exitoso, contador reseteado — otro fallo no debería disparar 429
        $this->postJson('/api/v1/auth/login', [
            'email'    => 'owner@example.com',
            'password' => 'wrongpass',
        ])->assertStatus(422);
    }

    /** @test */
    public function el_token_tiene_abilities_segun_rol(): void
    {
        $superAdmin = User::factory()->superAdmin()->create(['password' => Hash::make('secret123')]);

        $resp = $this->postJson('/api/v1/auth/login', [
            'email'    => $superAdmin->email,
            'password' => 'secret123',
        ])->assertOk();

        $token = $resp->json('token');
        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

        $this->assertEquals(['*'], $accessToken->abilities);
    }

    /** @test */
    public function logout_revoca_solo_el_token_actual(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret123')]);

        // 2 logins → 2 tokens
        $token1 = $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ])->json('token');

        $token2 = $this->postJson('/api/v1/auth/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ])->json('token');

        $this->assertSame(2, $user->tokens()->count());

        // Logout del token2
        $this->withHeader('Authorization', "Bearer {$token2}")
             ->postJson('/api/v1/auth/logout')
             ->assertNoContent();

        // token1 sigue vivo
        $this->assertSame(1, $user->tokens()->count());
        $this->withHeader('Authorization', "Bearer {$token1}")
             ->getJson('/api/v1/auth/me')
             ->assertOk();
    }
}
