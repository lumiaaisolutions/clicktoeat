<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class IdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private Producto $producto;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local    = Local::factory()->conHorarios()->create();
        $categoria      = Categoria::factory()->paraLocal($this->local)->create();
        $ingrediente    = Ingrediente::factory()->paraLocal($this->local)->conStock(1000)->create();
        $this->producto = Producto::factory()
            ->paraLocal($this->local, $categoria)
            ->conReceta($ingrediente, 1)
            ->create(['precio' => 30]);
    }

    private function payload(): array
    {
        return [
            'cliente'        => ['nombre' => 'X', 'telefono' => '5215512345678'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $this->producto->id, 'cantidad' => 1]],
        ];
    }

    /** @test */
    public function sin_idempotency_key_funciona_como_antes(): void
    {
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();
        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        $this->assertSame(2, Pedido::count());
    }

    /** @test */
    public function con_idempotency_key_dos_requests_iguales_crean_un_solo_pedido(): void
    {
        $key = Str::uuid()->toString();

        $r1 = $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        $r2 = $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        // Sólo un pedido en BD
        $this->assertSame(1, Pedido::count());

        // La 2da response viene del cache (mismo body + header replayed)
        $this->assertSame($r1->json('data.id'), $r2->json('data.id'));
        $r2->assertHeader('Idempotency-Replayed', 'true');
    }

    /** @test */
    public function misma_key_con_body_distinto_devuelve_409(): void
    {
        $key = Str::uuid()->toString();

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        $body2 = $this->payload();
        $body2['items'][0]['cantidad'] = 99;

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $body2)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Idempotency-Key reusada con body distinto. Usar key nueva.');

        // Sigue habiendo sólo 1 pedido
        $this->assertSame(1, Pedido::count());
    }

    /** @test */
    public function keys_distintas_crean_pedidos_distintos(): void
    {
        $this->withHeader('Idempotency-Key', Str::uuid()->toString())
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        $this->withHeader('Idempotency-Key', Str::uuid()->toString())
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();

        $this->assertSame(2, Pedido::count());
    }

    /** @test */
    public function key_invalido_devuelve_400(): void
    {
        $this->withHeader('Idempotency-Key', 'mal!')
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertStatus(400);
    }

    /** @test */
    public function respuesta_de_error_NO_se_cachea(): void
    {
        // Cierro temporalmente el local — el pedido falla con 409
        $this->local->update(['cerrado_temporal' => true]);

        $key = Str::uuid()->toString();

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertStatus(409);

        // Reabrir y reintentar con misma key — debe procesar normal (no devolver el 409 cacheado)
        $this->local->update(['cerrado_temporal' => false]);

        $this->withHeader('Idempotency-Key', $key)
            ->postJson("/api/v1/public/pedidos/{$this->local->slug}", $this->payload())
            ->assertCreated();
    }
}
