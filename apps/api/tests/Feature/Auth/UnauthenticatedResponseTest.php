<?php

namespace Tests\Feature\Auth;

use Tests\TestCase;

/**
 * Asegura que cualquier endpoint API guarded devuelve 401 JSON
 * sin importar si el cliente mandó Accept: application/json o no.
 *
 * Bug pre-existente: sin Accept JSON el middleware Authenticate
 * intentaba `route('login')` que no existía → 500 RouteNotFoundException.
 * Fixed agregando stub en routes/web.php.
 */
class UnauthenticatedResponseTest extends TestCase
{
    /** @test */
    public function api_guarded_devuelve_401_con_accept_json(): void
    {
        $this->getJson('/api/v1/pedidos')
            ->assertStatus(401)
            ->assertJsonPath('message', 'No autenticado');
    }

    /** @test */
    public function api_guarded_devuelve_401_sin_accept_json(): void
    {
        // Esto es lo que antes daba 500 — curl plano.
        $this->get('/api/v1/pedidos')
            ->assertStatus(401);
    }

    /** @test */
    public function ruta_login_named_responde_401_json(): void
    {
        $this->get('/login')
            ->assertStatus(401)
            ->assertJsonPath('message', 'No autenticado');
    }

    /** @test */
    public function gastos_guarded_devuelve_401_sin_accept_json(): void
    {
        // Específico para el módulo de Gastos — el reporte original.
        $this->get('/api/v1/gastos')
            ->assertStatus(401);
    }
}
