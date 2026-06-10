<?php

namespace Tests\Feature;

use App\Models\Compra;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ComprasTest extends TestCase
{
    use RefreshDatabase;

    protected Local $local;
    protected User  $owner;
    protected Ingrediente $fresa;
    protected Ingrediente $chantilly;

    protected function setUp(): void
    {
        parent::setUp();

        $this->local = Local::create([
            'nombre' => 'Postres', 'slug' => 'p', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'o@p.test',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->local->id,
        ]);
        $this->fresa = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Fresa',
            'stock' => 5, 'stock_minimo' => 1, 'unidad' => 'kg',
            'costo_unitario' => 70, 'activo' => true,
        ]);
        $this->chantilly = Ingrediente::create([
            'local_id' => $this->local->id, 'nombre' => 'Chantilly',
            'stock' => 2, 'stock_minimo' => 0.5, 'unidad' => 'l',
            'costo_unitario' => 95, 'activo' => true,
        ]);
    }

    /** @test */
    public function registra_compra_aumenta_stock_y_genera_movimientos(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'proveedor'          => 'Central de Abastos',
                'referencia_factura' => 'F-2026-0123',
                'fecha'              => '2026-05-19',
                'items' => [
                    ['ingrediente_id' => $this->fresa->id,     'cantidad' => 3,   'costo_unitario' => 90],
                    ['ingrediente_id' => $this->chantilly->id, 'cantidad' => 1.5, 'costo_unitario' => 100],
                ],
            ]);

        $resp->assertCreated()
            ->assertJsonPath('data.proveedor', 'Central de Abastos')
            ->assertJsonPath('data.estado',     'registrada');

        // Subtotal = 3×90 + 1.5×100 = 270 + 150 = 420
        $this->assertEqualsWithDelta(420.0, (float) $resp->json('data.total'), 0.001);

        // Stocks aumentados
        $this->assertEqualsWithDelta(8.0, (float) $this->fresa->fresh()->stock, 0.001);
        $this->assertEqualsWithDelta(3.5, (float) $this->chantilly->fresh()->stock, 0.001);

        // Movimientos registrados
        $this->assertSame(2, MovimientoInventario::where('tipo', 'entrada')->count());
        $this->assertSame(2, MovimientoInventario::where('referencia', 'like', 'compra:%')->count());
    }

    /** @test */
    public function actualiza_costo_unitario_con_promedio_ponderado(): void
    {
        // Fresa: stock=5 kg @ $70 = $350 valor en stock
        // Compra:        3 kg @ $90 = $270
        // Total: 8 kg con valor $620 → $77.50 / kg
        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [
                    ['ingrediente_id' => $this->fresa->id, 'cantidad' => 3, 'costo_unitario' => 90],
                ],
            ])
            ->assertCreated();

        $this->assertEqualsWithDelta(77.50, (float) $this->fresa->fresh()->costo_unitario, 0.01);
    }

    /** @test */
    public function promedio_ponderado_cuando_stock_anterior_era_cero(): void
    {
        // Stock vacío → el costo nuevo es exactamente el costo de la compra
        $this->fresa->update(['stock' => 0]);

        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [
                    ['ingrediente_id' => $this->fresa->id, 'cantidad' => 5, 'costo_unitario' => 88],
                ],
            ])
            ->assertCreated();

        $this->assertEqualsWithDelta(88.0, (float) $this->fresa->fresh()->costo_unitario, 0.01);
        $this->assertEqualsWithDelta(5.0,  (float) $this->fresa->fresh()->stock,          0.001);
    }

    /** @test */
    public function anular_compra_revierte_stock_si_alcanza(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->fresa->id, 'cantidad' => 3, 'costo_unitario' => 90]],
            ])->assertCreated();

        $compraId = (int) $resp->json('data.id');
        $this->assertEqualsWithDelta(8.0, (float) $this->fresa->fresh()->stock, 0.001);

        // Anular
        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/v1/compras/{$compraId}")
            ->assertOk()
            ->assertJsonPath('data.estado', 'anulada');

        // Stock vuelve a 5
        $this->assertEqualsWithDelta(5.0, (float) $this->fresa->fresh()->stock, 0.001);

        // Movimientos: 1 entrada + 1 salida de anulación
        $this->assertSame(1, MovimientoInventario::where('referencia', "compra:{$compraId}")->count());
        $this->assertSame(1, MovimientoInventario::where('referencia', "compra:{$compraId}:anulacion")->count());
    }

    /** @test */
    public function rechaza_anular_si_ya_se_consumio_parte_del_stock(): void
    {
        $resp = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->fresa->id, 'cantidad' => 3, 'costo_unitario' => 90]],
            ])->assertCreated();

        $compraId = (int) $resp->json('data.id');

        // Simular consumo bajando stock
        $this->fresa->update(['stock' => 6]); // Antes era 8, "se consumieron" 2 kg

        $resp = $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/v1/compras/{$compraId}");

        // Comprado 3 kg, stock actual sólo 6 — sí alcanza (6 ≥ 3) → debe permitir
        $resp->assertOk();
        $this->assertEqualsWithDelta(3.0, (float) $this->fresa->fresh()->stock, 0.001);

        // Probemos el caso contrario: la mayoría del stock comprado se consumió
        $this->fresa->update(['stock' => 3]);
        $resp2 = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->fresa->id, 'cantidad' => 10, 'costo_unitario' => 90]],
            ])->assertCreated();
        $compra2Id = (int) $resp2->json('data.id');
        // Stock ahora 13 kg. Si bajo a 2 (consumí 11), no se puede anular (10 > 2)
        $this->fresa->update(['stock' => 2]);

        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/v1/compras/{$compra2Id}")
            ->assertStatus(409)
            ->assertJsonPath('faltantes.0.ingrediente', 'Fresa');
    }

    /** @test */
    public function lista_compras_filtrable_por_estado(): void
    {
        $r1 = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->fresa->id, 'cantidad' => 1, 'costo_unitario' => 90]],
            ])->assertCreated();
        $r2 = $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->chantilly->id, 'cantidad' => 1, 'costo_unitario' => 100]],
            ])->assertCreated();

        $this->actingAs($this->owner, 'sanctum')
            ->deleteJson("/api/v1/compras/".$r1->json('data.id'))->assertOk();

        $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/compras?estado=registrada')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/compras?estado=anulada')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function staff_puede_registrar_pero_no_anular(): void
    {
        $staff = User::create([
            'nombre' => 'Cajero', 'email' => 'cajero@p.test',
            'password' => Hash::make('password123'), 'rol' => 'staff',
            'local_id' => $this->local->id,
        ]);

        $resp = $this->actingAs($staff, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $this->fresa->id, 'cantidad' => 1, 'costo_unitario' => 90]],
            ])->assertCreated();

        $compraId = (int) $resp->json('data.id');

        $this->actingAs($staff, 'sanctum')
            ->deleteJson("/api/v1/compras/{$compraId}")
            ->assertStatus(403);
    }

    /** @test */
    public function rechaza_ingrediente_de_otro_local(): void
    {
        $otroLocal = Local::create([
            'nombre' => 'O', 'slug' => 'o', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);
        $ingAjeno = Ingrediente::create([
            'local_id' => $otroLocal->id, 'nombre' => 'Foreign',
            'stock' => 10, 'unidad' => 'pz', 'activo' => true,
        ]);

        $this->actingAs($this->owner, 'sanctum')
            ->postJson('/api/v1/compras', [
                'fecha' => '2026-05-19',
                'items' => [['ingrediente_id' => $ingAjeno->id, 'cantidad' => 1, 'costo_unitario' => 90]],
            ])
            ->assertStatus(422);
    }
}
