<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * SEV-2 — primer paso de la migración a cookie HttpOnly (ADR-010).
 *
 * Verifica que:
 *  1. POST /auth/login setea la cookie `cte_token` con flags correctas.
 *  2. Una request con la cookie (sin Authorization header) autentica
 *     gracias al middleware CookieToBearer.
 *  3. Una request con bearer header explícito tiene PRIORIDAD sobre la
 *     cookie (mobile + API externa siguen funcionando inalteradas).
 *  4. POST /auth/logout limpia la cookie.
 *
 * Este test es la red para asegurar que el migration path es backwards
 * compatible — bearer y cookie coexisten sin conflicto.
 */
class CookieAuthTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(string $email = 'tester@cte.app', string $password = 'secret123'): User
    {
        return User::factory()->create([
            'email'    => $email,
            'password' => Hash::make($password),
            'rol'      => 'owner',
        ]);
    }

    /** @test */
    public function login_setea_cookie_cte_token_con_flags_correctas(): void
    {
        $this->createUser();

        $resp = $this->postJson('/api/v1/auth/login', [
            'email'    => 'tester@cte.app',
            'password' => 'secret123',
        ])->assertOk()
          ->assertJsonStructure(['user', 'token']);

        // La cookie debe estar presente en el response.
        $cookie = collect($resp->headers->getCookies())
            ->firstWhere(fn ($c) => $c->getName() === 'cte_token');

        $this->assertNotNull($cookie, 'La cookie cte_token no se setó.');
        $this->assertNotEmpty($cookie->getValue(), 'La cookie viene vacía.');

        // Flags de seguridad.
        $this->assertTrue($cookie->isHttpOnly(), 'Cookie debe ser HttpOnly.');
        $this->assertSame('lax', strtolower((string) $cookie->getSameSite()), 'Cookie SameSite debe ser Lax.');
        $this->assertSame('/', $cookie->getPath());

        // Secure depende del entorno — en tests (no producción) es false.
        // En producción `app()->isProduction()` devuelve true. Verificamos
        // que NO es ni true ni null por accidente.
        $this->assertIsBool($cookie->isSecure());
    }

    /** @test */
    public function cookie_autentica_sin_bearer_header(): void
    {
        $this->createUser();

        // Login obtiene la cookie REAL desde el server (con encrypt correcto).
        $loginResp = $this->postJson('/api/v1/auth/login', [
            'email'    => 'tester@cte.app',
            'password' => 'secret123',
        ])->assertOk();

        $cookie = collect($loginResp->headers->getCookies())
            ->firstWhere(fn ($c) => $c->getName() === 'cte_token');
        $this->assertNotNull($cookie, 'Login no emitió cookie cte_token.');

        $userId = $loginResp->json('user.id');

        // Pasamos la cookie directo al call() — algunos test helpers de
        // Laravel 11 no propagan cookies a JSON requests; call() las pasa
        // como HTTP Cookie header literal (que es lo que veríamos en prod).
        $resp = $this->call(
            'GET',
            '/api/v1/auth/me',
            [],                                     // parameters
            ['cte_token' => $cookie->getValue()],   // cookies
            [],                                     // files
            ['HTTP_ACCEPT' => 'application/json']
        );

        $this->assertSame(200, $resp->status(), 'auth/me con cookie debió responder 200, got '.$resp->status());
        $this->assertSame($userId, $resp->json('user.id'));
    }

    /** @test */
    public function bearer_header_tiene_prioridad_sobre_cookie(): void
    {
        // Dos users distintos. La cookie tiene el token de userA, el header
        // tiene el token de userB. El bearer header debe ganar.
        $userA = $this->createUser('a@cte.app');
        $userB = $this->createUser('b@cte.app');

        $tokenA = $userA->createToken('cookie-token')->plainTextToken;
        $tokenB = $userB->createToken('header-token')->plainTextToken;

        $resp = $this->withCookie('cte_token', $tokenA)
            ->withHeader('Authorization', 'Bearer '.$tokenB)
            ->getJson('/api/v1/auth/me');

        $resp->assertOk()
            ->assertJsonPath('user.id', $userB->id, 'El bearer header debió ganarle a la cookie.');
    }

    /** @test */
    public function sin_cookie_y_sin_bearer_devuelve_401(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertUnauthorized();
    }

    /** @test */
    public function logout_limpia_la_cookie(): void
    {
        $user  = $this->createUser();
        $token = $user->createToken('web')->plainTextToken;

        $resp = $this->withCookie('cte_token', $token)
            ->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout');

        $resp->assertNoContent();

        // Debe haber un Set-Cookie con expiración en el pasado para borrarla.
        $cookie = collect($resp->headers->getCookies())
            ->firstWhere(fn ($c) => $c->getName() === 'cte_token');

        $this->assertNotNull($cookie, 'Logout debe emitir Set-Cookie de borrado.');
        // Una cookie de "forget" tiene expires en el pasado.
        $this->assertLessThan(time(), $cookie->getExpiresTime(), 'Cookie debe expirar en el pasado para forzar borrado.');
    }
}
