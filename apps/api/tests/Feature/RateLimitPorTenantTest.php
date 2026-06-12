<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitPorTenantTest extends TestCase
{
    use RefreshDatabase;

    private Local $localA;
    private Local $localB;
    private Producto $productoA;
    private Producto $productoB;

    protected function setUp(): void
    {
        parent::setUp();

        // Limpiar limiters de runs anteriores
        RateLimiter::clear('local:tacos-a');
        RateLimiter::clear('local:pizza-b');
        RateLimiter::clear('127.0.0.1');

        $this->localA = Local::factory()->conHorarios()->create(['slug' => 'tacos-a']);
        $this->localB = Local::factory()->conHorarios()->create(['slug' => 'pizza-b']);

        $catA = Categoria::factory()->paraLocal($this->localA)->create();
        $catB = Categoria::factory()->paraLocal($this->localB)->create();

        $ingA = Ingrediente::factory()->paraLocal($this->localA)->conStock(100000)->create();
        $ingB = Ingrediente::factory()->paraLocal($this->localB)->conStock(100000)->create();

        $this->productoA = Producto::factory()->paraLocal($this->localA, $catA)->conReceta($ingA, 0.001)->create(['precio' => 10]);
        $this->productoB = Producto::factory()->paraLocal($this->localB, $catB)->conReceta($ingB, 0.001)->create(['precio' => 10]);
    }

    private function pedirPara(Local $local, Producto $producto): \Illuminate\Testing\TestResponse
    {
        return $this->postJson("/api/v1/public/pedidos/{$local->slug}", [
            'cliente'        => ['nombre' => 'X', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $producto->id, 'cantidad' => 1]],
        ]);
    }

    /** @test */
    public function el_limit_por_ip_se_dispara_a_los_20_requests(): void
    {
        // El limit por IP es 20/min. Hagamos 20 al local A — deben pasar.
        // El 21vo debe ser 429.
        for ($i = 0; $i < 20; $i++) {
            $resp = $this->pedirPara($this->localA, $this->productoA);
            // Algunos pueden fallar por stock u otros motivos; aceptamos 201, 409, 422
            $this->assertContains($resp->status(), [201, 409, 422], "Request {$i} status inesperado");
        }

        $this->pedirPara($this->localA, $this->productoA)->assertStatus(429);
    }

    /** @test */
    public function al_saturar_un_local_OTRO_local_sigue_funcionando_si_son_IPs_distintas(): void
    {
        // Saturar local A simulando IPs distintas (cada request con server header IP custom).
        // Como la suite usa el mismo IP, este test verifica que el limit POR TENANT funciona
        // (no que el limit por IP no aplique).

        // Generamos 99 pedidos al local A (debajo del límite por tenant de 100/min)
        // pero forzando IPs distintas para no chocar con el límite por IP.
        for ($i = 0; $i < 99; $i++) {
            $resp = $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
                ->pedirPara($this->localA, $this->productoA);
            $this->assertNotEquals(429, $resp->status(), "Request {$i} para local A no debería ser 429 todavía");
        }

        // 100mo: ese es el límite por tenant — el siguiente debe ser 429
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.250'])
            ->pedirPara($this->localA, $this->productoA);

        // 101vo desde IP nueva — bloqueado por tenant
        $resp = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.251'])
            ->pedirPara($this->localA, $this->productoA);

        $this->assertSame(429, $resp->status(), 'Local A debería estar saturado');

        // Local B sigue funcionando — no comparte limiter
        $respB = $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.252'])
            ->pedirPara($this->localB, $this->productoB);

        $this->assertNotEquals(429, $respB->status(), 'Local B NO debería ser 429 — no comparte limiter con A');
    }
}
