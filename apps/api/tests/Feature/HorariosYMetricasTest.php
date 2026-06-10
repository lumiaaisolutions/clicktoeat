<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use App\Support\HorarioCalculator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HorariosYMetricasTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Test', 'slug' => 't', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'activo' => true,
            'zona_horaria' => 'America/Mexico_City',
        ]);
        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'o@t.test',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->local->id,
        ]);
    }

    // ── Horarios ──────────────────────────────────────────────

    /** @test */
    public function get_horarios_devuelve_estado_calculado(): void
    {
        $this->local->update(['horarios' => [
            ['dia' => 'lun', 'open' => '10:00', 'close' => '20:00'],
        ]]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/local/horarios');

        $resp->assertOk()
            ->assertJsonStructure(['data' => ['horarios', 'cerrado_temporal', 'zona_horaria',
                'estado' => ['abierto', 'mensaje']]]);
    }

    /** @test */
    public function patch_horarios_actualiza_y_ordena_por_dia(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->patchJson('/api/v1/local/horarios', [
                'horarios' => [
                    ['dia' => 'vie', 'open' => '11:00', 'close' => '23:00'],
                    ['dia' => 'lun', 'open' => '10:00', 'close' => '20:00'],
                    ['dia' => 'mie', 'open' => '10:00', 'close' => '20:00'],
                ],
            ]);

        $resp->assertOk();
        $dias = collect($resp->json('data.horarios'))->pluck('dia')->all();
        $this->assertSame(['lun', 'mie', 'vie'], $dias);
    }

    /** @test */
    public function patch_horarios_dedup_dia_duplicado(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->patchJson('/api/v1/local/horarios', [
                'horarios' => [
                    ['dia' => 'lun', 'open' => '10:00', 'close' => '14:00'],
                    ['dia' => 'lun', 'open' => '11:00', 'close' => '20:00'],
                ],
            ]);

        $resp->assertOk();
        $this->assertCount(1, $resp->json('data.horarios'));
        // El último gana
        $this->assertSame('11:00', $resp->json('data.horarios.0.open'));
    }

    /** @test */
    public function cerrado_temporal_fuerza_estado_cerrado(): void
    {
        $this->local->update([
            'horarios' => [['dia' => 'lun', 'open' => '00:00', 'close' => '23:59']],
            'cerrado_temporal' => true,
        ]);

        $estado = HorarioCalculator::estado($this->local->fresh());

        $this->assertFalse($estado['abierto']);
        $this->assertStringContainsString('Cerrado', $estado['mensaje']);
    }

    /** @test */
    public function sin_horarios_devuelve_estado_null(): void
    {
        $estado = HorarioCalculator::estado($this->local->fresh());

        $this->assertNull($estado['abierto']);
        $this->assertSame('Sin horario definido', $estado['mensaje']);
    }

    /** @test */
    public function endpoint_publico_de_menu_incluye_estado(): void
    {
        $this->local->update(['horarios' => [
            ['dia' => 'lun', 'open' => '10:00', 'close' => '20:00'],
        ]]);

        $resp = $this->getJson("/api/v1/public/menu/{$this->local->slug}");

        $resp->assertOk()->assertJsonStructure([
            'data' => ['local' => ['estado' => ['abierto', 'mensaje']]],
        ]);
    }

    // ── Métricas ──────────────────────────────────────────────

    /** @test */
    public function metricas_calcula_ventas_y_ticket_promedio(): void
    {
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prod = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);

        // 3 pedidos de $30, $50, $80 = $160, ticket 53.33
        foreach ([30, 50, 80] as $total) {
            Pedido::create([
                'local_id' => $this->local->id,
                'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
                'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
                'subtotal' => $total, 'total' => $total, 'estado' => 'confirmado',
            ]);
        }
        // Y un cancelado que NO debe contarse
        Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 999, 'total' => 999, 'estado' => 'cancelado',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/metricas?preset=7d');

        $resp->assertOk()
            ->assertJsonPath('data.resumen.pedidos', 3)
            ->assertJsonPath('data.resumen.ventas_total', 160);

        $this->assertEqualsWithDelta(53.33, $resp->json('data.resumen.ticket_promedio'), 0.1);
    }

    /** @test */
    public function metricas_serie_diaria_rellena_dias_sin_ventas(): void
    {
        Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 100, 'total' => 100, 'estado' => 'confirmado',
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/metricas?preset=7d');

        $resp->assertOk();
        $serie = $resp->json('data.serie_diaria');
        $this->assertCount(7, $serie);
        $ultimo = end($serie);
        $this->assertSame(1, $ultimo['pedidos']);
    }

    /** @test */
    public function metricas_top_productos_ordenado_por_cantidad(): void
    {
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);

        $pedido = Pedido::create([
            'local_id' => $this->local->id,
            'cliente_nombre' => 'X', 'cliente_telefono' => '5215511111111',
            'metodo_entrega' => 'pickup', 'metodo_pago' => 'efectivo',
            'subtotal' => 100, 'total' => 100, 'estado' => 'confirmado',
        ]);

        // Detalles snapshot (no requieren producto vivo)
        \App\Models\DetallePedido::create([
            'pedido_id' => $pedido->id, 'producto_id' => null,
            'producto_nombre' => 'Taco', 'precio_unitario' => 30,
            'cantidad' => 5, 'subtotal' => 150,
        ]);
        \App\Models\DetallePedido::create([
            'pedido_id' => $pedido->id, 'producto_id' => null,
            'producto_nombre' => 'Refresco', 'precio_unitario' => 20,
            'cantidad' => 2, 'subtotal' => 40,
        ]);

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/metricas?preset=7d');

        $top = $resp->json('data.top_productos');
        $this->assertSame('Taco',     $top[0]['producto_nombre']);
        $this->assertSame(5.0,        (float) $top[0]['cantidad']);
        $this->assertSame('Refresco', $top[1]['producto_nombre']);
    }

    /** @test */
    public function metricas_acepta_rango_custom_desde_hasta(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/metricas?desde=2026-05-01&hasta=2026-05-10');

        $resp->assertOk()
            ->assertJsonPath('data.rango.desde', '2026-05-01')
            ->assertJsonPath('data.rango.hasta', '2026-05-10')
            ->assertJsonPath('data.rango.dias', 10);
    }

    // ── Bloqueo de pedidos cuando cerrado ─────────────────────

    /** @test */
    public function pedido_publico_se_rechaza_si_local_cerrado_temporal(): void
    {
        $this->local->update(['cerrado_temporal' => true]);
        // Crear un producto para que la petición sea válida
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prod = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);

        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $prod->id, 'cantidad' => 1]],
        ]);

        $resp->assertStatus(409)
            ->assertJsonPath('estado.abierto', false)
            ->assertJsonStructure(['message', 'estado' => ['abierto', 'mensaje']]);

        // No se creó pedido
        $this->assertSame(0, Pedido::count());
    }

    /** @test */
    public function pedido_publico_se_rechaza_si_esta_fuera_de_horario(): void
    {
        // Horarios artificiales que NO incluyen la hora actual
        // En el peor caso para que falle el test: ahora son las 12:00, ponemos 23:00 → 23:59
        $horaRara = '23:00';
        $horaCierre = '23:30';
        // Si la hora actual está dentro del rango, ajustamos a otro
        $nowHour = (int) date('H', strtotime('now America/Mexico_City'));
        if ($nowHour >= 23) {
            $horaRara = '03:00';
            $horaCierre = '03:30';
        }

        $this->local->update([
            'horarios' => array_map(fn ($d) => [
                'dia' => $d, 'open' => $horaRara, 'close' => $horaCierre,
            ], ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']),
        ]);

        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prod = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);

        $resp = $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $prod->id, 'cantidad' => 1]],
        ]);

        $resp->assertStatus(409)->assertJsonPath('estado.abierto', false);
        $this->assertSame(0, Pedido::count());
    }

    /** @test */
    public function pedido_publico_funciona_sin_horarios_definidos(): void
    {
        // Si el local no tiene horarios, NO bloqueamos (estado.abierto === null)
        $this->local->update(['horarios' => null]);

        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prod = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);

        $this->postJson("/api/v1/public/pedidos/{$this->local->slug}", [
            'cliente'        => ['nombre' => 'Cliente', 'telefono' => '5215511111111'],
            'metodo_entrega' => 'pickup',
            'metodo_pago'    => 'efectivo',
            'items'          => [['producto_id' => $prod->id, 'cantidad' => 1]],
        ])->assertCreated();
    }

    /** @test */
    public function pos_interno_si_acepta_pedido_aunque_local_cerrado(): void
    {
        // El owner debe poder vender en caja aunque la entrega online esté cerrada
        $this->local->update(['cerrado_temporal' => true]);
        $cat = Categoria::create([
            'local_id' => $this->local->id, 'nombre' => 'X', 'slug' => 'x', 'orden' => 0, 'activo' => true,
        ]);
        $prod = Producto::create([
            'local_id' => $this->local->id, 'categoria_id' => $cat->id,
            'nombre' => 'Taco', 'slug' => 'taco', 'precio' => 30, 'disponible' => true,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/pedidos', [
                'cliente'        => ['nombre' => 'Mostrador'],
                'metodo_entrega' => 'sucursal',
                'metodo_pago'    => 'efectivo',
                'items'          => [['producto_id' => $prod->id, 'cantidad' => 1]],
            ])
            ->assertCreated();
    }

    /** @test */
    public function metricas_requiere_local(): void
    {
        $superAdmin = User::create([
            'nombre' => 'SA', 'email' => 'sa@t.test',
            'password' => Hash::make('p'), 'rol' => 'super_admin',
            'local_id' => null,
        ]);
        $superAdmin = User::findOrFail($superAdmin->id);

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/v1/metricas')
            ->assertStatus(403);
    }
}
