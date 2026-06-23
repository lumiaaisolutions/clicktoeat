<?php

namespace Tests\Feature;

use App\Models\Gasto;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MetricasUtilidadTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function owner_ve_utilidad_mensual_con_ventas_y_gastos(): void
    {
        $local = Local::factory()->create();
        $owner = User::factory()->owner($local)->create();

        // Ventas del mes actual: $5,000
        Pedido::factory()->create([
            'local_id' => $local->id, 'estado' => 'entregado',
            'total' => 2000, 'created_at' => now()->startOfMonth()->addDay(),
        ]);
        Pedido::factory()->create([
            'local_id' => $local->id, 'estado' => 'entregado',
            'total' => 3000, 'created_at' => now()->startOfMonth()->addDays(2),
        ]);
        // Cancelado NO debe contar
        Pedido::factory()->create([
            'local_id' => $local->id, 'estado' => 'cancelado',
            'total' => 9990, 'created_at' => now()->startOfMonth()->addDays(3),
        ]);

        // Gastos del mes: $1,500
        Gasto::factory()->create([
            'local_id' => $local->id, 'monto_centavos' => 100000,
            'fecha' => now()->startOfMonth()->addDay(),
        ]);
        Gasto::factory()->create([
            'local_id' => $local->id, 'monto_centavos' => 50000,
            'fecha' => now()->startOfMonth()->addDays(4),
        ]);

        Sanctum::actingAs($owner, ['*']);

        $resp = $this->getJson('/api/v1/metricas/utilidad?meses=3')->assertOk();

        $serie = $resp->json('data.serie');
        $this->assertCount(3, $serie);

        // El último elemento del array es el mes actual
        $current = end($serie);
        $this->assertEquals(5000, $current['ventas_mxn']);
        $this->assertEquals(1500, $current['gastos_mxn']);
        $this->assertEquals(3500, $current['utilidad_mxn']);
        $this->assertEquals(70.0, $current['margen_pct']);

        $this->assertEquals(5000, $resp->json('data.total_ventas'));
        $this->assertEquals(1500, $resp->json('data.total_gastos'));
        $this->assertEquals(3500, $resp->json('data.total_utilidad'));
    }

    /** @test */
    public function utilidad_excluye_gastos_de_otros_locales(): void
    {
        $local = Local::factory()->create();
        $owner = User::factory()->owner($local)->create();

        $otroLocal = Local::factory()->create();
        Gasto::factory()->create([
            'local_id' => $otroLocal->id, 'monto_centavos' => 999000,
            'fecha' => now()->startOfMonth()->addDay(),
        ]);

        Sanctum::actingAs($owner, ['*']);
        $resp = $this->getJson('/api/v1/metricas/utilidad?meses=1')->assertOk();

        // El gasto del otro local NO debe contar (TenantScope)
        $this->assertEquals(0, $resp->json('data.total_gastos'));
    }
}
