<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class TurnstileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function enableTurnstile(): void
    {
        config(['services.turnstile.secret' => 'test-secret']);
    }

    private function fakeSiteverify(bool $success): void
    {
        Http::fake([
            'challenges.cloudflare.com/*' => Http::response(['success' => $success], 200),
        ]);
    }

    // ─── No-op cuando el secret NO está configurado ──────────────────────

    /** @test */
    public function registro_sin_secret_funciona_sin_token(): void
    {
        Http::fake(); // ninguna llamada externa esperada

        $this->postJson('/api/v1/auth/register', [
            'nombre' => 'Sin Captcha',
            'email' => 'sincaptcha@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated();

        Http::assertNothingSent();
    }

    /** @test */
    public function login_sin_secret_funciona_sin_token(): void
    {
        Http::fake();
        User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'secret123',
        ])->assertOk();

        Http::assertNothingSent();
    }

    // ─── Registro con secret configurado exige token SIEMPRE ─────────────

    /** @test */
    public function registro_con_secret_sin_token_devuelve_422_captcha_required(): void
    {
        $this->enableTurnstile();

        $this->postJson('/api/v1/auth/register', [
            'nombre' => 'Bot',
            'email' => 'bot@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422)->assertJsonPath('code', 'CAPTCHA_REQUIRED');

        $this->assertDatabaseMissing('users', ['email' => 'bot@example.com']);
    }

    /** @test */
    public function registro_con_secret_y_token_valido_crea_cuenta(): void
    {
        $this->enableTurnstile();
        $this->fakeSiteverify(true);

        $this->postJson('/api/v1/auth/register', [
            'nombre' => 'Humano',
            'email' => 'humano@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'turnstile_token' => 'valid-token',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'humano@example.com']);
    }

    /** @test */
    public function registro_con_token_rechazado_por_cloudflare_devuelve_422(): void
    {
        $this->enableTurnstile();
        $this->fakeSiteverify(false);

        $this->postJson('/api/v1/auth/register', [
            'nombre' => 'Bot',
            'email' => 'bot2@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'turnstile_token' => 'bad-token',
        ])->assertStatus(422)->assertJsonPath('code', 'CAPTCHA_REQUIRED');
    }

    /** @test */
    public function signup_prospect_con_secret_sin_token_devuelve_422(): void
    {
        $this->enableTurnstile();

        $this->postJson('/api/v1/auth/signup-prospect', [
            'nombre' => 'Bot',
            'email' => 'botprospect@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422)->assertJsonPath('code', 'CAPTCHA_REQUIRED');
    }

    // ─── Login: captcha SOLO tras ≥3 fallos ──────────────────────────────

    /** @test */
    public function login_con_secret_no_exige_captcha_en_primeros_intentos(): void
    {
        $this->enableTurnstile();
        Http::fake();
        User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        // 2 fallos: usuario normal, sin captcha (respuesta 422 de credenciales,
        // sin captcha_required aún)
        for ($i = 0; $i < 2; $i++) {
            $resp = $this->postJson('/api/v1/auth/login', [
                'email' => 'owner@example.com',
                'password' => 'wrongpass',
            ]);
            $resp->assertStatus(422);
            $this->assertNull($resp->json('captcha_required'));
        }

        Http::assertNothingSent();
    }

    /** @test */
    public function login_marca_captcha_required_al_alcanzar_umbral(): void
    {
        $this->enableTurnstile();
        Http::fake();
        User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        // 1er y 2do fallo: sin flag. 3er fallo: alcanza umbral → captcha_required.
        $this->postJson('/api/v1/auth/login', ['email' => 'owner@example.com', 'password' => 'wrongpass'])->assertStatus(422);
        $this->postJson('/api/v1/auth/login', ['email' => 'owner@example.com', 'password' => 'wrongpass'])->assertStatus(422);
        $third = $this->postJson('/api/v1/auth/login', ['email' => 'owner@example.com', 'password' => 'wrongpass']);
        $third->assertStatus(422)->assertJsonPath('captcha_required', true);
    }

    /** @test */
    public function login_tras_umbral_exige_token_valido(): void
    {
        $this->enableTurnstile();
        User::factory()->create([
            'email' => 'owner@example.com',
            'password' => Hash::make('secret123'),
        ]);

        // Fuerza 3 fallos previos en el contador por email.
        $emailKey = 'login:email:owner@example.com';
        for ($i = 0; $i < 3; $i++) {
            RateLimiter::hit($emailKey, 900);
        }

        // El siteverify fake responde success; el primer request no lleva token
        // así que verify() corta antes de llamar a Cloudflare igual.
        $this->fakeSiteverify(true);

        // Sin token → 422 CAPTCHA_REQUIRED, incluso con credenciales correctas.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'secret123',
        ])->assertStatus(422)->assertJsonPath('code', 'CAPTCHA_REQUIRED');

        // Con token válido → login OK.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@example.com',
            'password' => 'secret123',
            'turnstile_token' => 'valid-token',
        ])->assertOk();
    }
}
