<?php

namespace Tests\Feature;

use App\Models\Gasto;
use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GastoTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->local = Local::factory()->create();
        $this->owner = User::factory()->owner($this->local)->create();
    }

    /** @test */
    public function owner_lista_gastos_de_su_local(): void
    {
        Gasto::factory()->count(3)->create(['local_id' => $this->local->id]);
        $otroLocal = Local::factory()->create();
        Gasto::factory()->count(2)->create(['local_id' => $otroLocal->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/gastos')->assertOk();
        $this->assertCount(3, $resp->json('data'));
    }

    /** @test */
    public function owner_crea_gasto_con_monto_en_mxn(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/gastos', [
            'categoria' => 'luz',
            'concepto'  => 'CFE bimestral',
            'monto_mxn' => 1234.56,
            'fecha'     => '2026-06-15',
            'recurrente'=> true,
        ])->assertCreated()
          ->assertJsonPath('data.categoria', 'luz')
          ->assertJsonPath('data.monto_centavos', 123456);

        $this->assertDatabaseHas('gastos', [
            'local_id'       => $this->local->id,
            'categoria'      => 'luz',
            'monto_centavos' => 123456,
            'recurrente'     => true,
        ]);
    }

    /** @test */
    public function categoria_no_valida_se_rechaza(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/gastos', [
            'categoria' => 'hackeando',
            'concepto'  => 'x',
            'monto_mxn' => 100,
            'fecha'     => '2026-06-15',
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('categoria');
    }

    /** @test */
    public function fecha_futura_se_rechaza(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/gastos', [
            'categoria' => 'luz',
            'concepto'  => 'x',
            'monto_mxn' => 100,
            'fecha'     => now()->addDays(5)->toDateString(),
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('fecha');
    }

    /** @test */
    public function staff_no_puede_crear_gasto(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson('/api/v1/gastos', [
            'categoria' => 'luz', 'concepto' => 'x', 'monto_mxn' => 100, 'fecha' => '2026-06-15',
        ])->assertForbidden();
    }

    /** @test */
    public function owner_no_puede_ver_gasto_de_otro_local(): void
    {
        $otroLocal = Local::factory()->create();
        $gastoAjeno = Gasto::factory()->create(['local_id' => $otroLocal->id]);

        Sanctum::actingAs($this->owner, ['*']);

        // La policy bloquea cross-tenant → 403 (route binding resuelve porque
        // no hay tenant context bypass, pero policy::view filtra).
        $this->getJson("/api/v1/gastos/{$gastoAjeno->id}")
            ->assertForbidden();
    }

    /** @test */
    public function owner_actualiza_su_gasto(): void
    {
        $gasto = Gasto::factory()->create([
            'local_id' => $this->local->id,
            'monto_centavos' => 100000,  // $1000
        ]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/gastos/{$gasto->id}", [
            'monto_mxn' => 1500.00,
            'notas'     => 'Aumentó por uso de aire',
        ])->assertOk()
          ->assertJsonPath('data.monto_centavos', 150000);
    }

    /** @test */
    public function owner_borra_gasto_soft_delete(): void
    {
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/gastos/{$gasto->id}")->assertNoContent();
        $this->assertSoftDeleted('gastos', ['id' => $gasto->id]);
    }

    /** @test */
    public function owner_sube_comprobante_imagen_al_gasto(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->image('factura.jpg', 800, 600),
        ])->assertOk();

        $url = $resp->json('data.comprobante_url');
        $this->assertNotNull($url);
        $this->assertStringContainsString('/storage/uploads/comprobantes/gasto-'.$gasto->id.'-', $url);

        // Verifica que el archivo realmente quedó en el disk fake.
        $files = Storage::disk('public')->files('uploads/comprobantes');
        $this->assertCount(1, $files);
    }

    /** @test */
    public function owner_sube_comprobante_pdf_al_gasto(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->create('factura.pdf', 200, 'application/pdf'),
        ])->assertOk();

        $this->assertCount(1, Storage::disk('public')->files('uploads/comprobantes'));
    }

    /** @test */
    public function comprobante_rechaza_extensiones_invalidas(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->create('virus.exe', 10),
        ])->assertUnprocessable()
          ->assertJsonValidationErrors('comprobante');
    }

    /** @test */
    public function comprobante_rechaza_archivo_demasiado_grande(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            // 6 MB > 5 MB de límite
            'comprobante' => UploadedFile::fake()->create('huge.pdf', 6 * 1024),
        ])->assertUnprocessable();
    }

    /** @test */
    public function staff_no_puede_subir_comprobante(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);
        $staff = User::factory()->staff($this->local)->create();

        Sanctum::actingAs($staff, ['*']);

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->image('factura.jpg'),
        ])->assertForbidden();
    }

    /** @test */
    public function owner_borra_comprobante(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        // Sube
        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->image('factura.jpg'),
        ])->assertOk();
        $this->assertCount(1, Storage::disk('public')->files('uploads/comprobantes'));

        // Borra
        $this->deleteJson("/api/v1/gastos/{$gasto->id}/comprobante")
            ->assertNoContent();

        $this->assertNull($gasto->fresh()->comprobante_url);
        $this->assertCount(0, Storage::disk('public')->files('uploads/comprobantes'));
    }

    /** @test */
    public function subir_segundo_comprobante_reemplaza_el_anterior(): void
    {
        Storage::fake('public');
        $gasto = Gasto::factory()->create(['local_id' => $this->local->id]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->image('uno.jpg'),
        ])->assertOk();

        $this->postJson("/api/v1/gastos/{$gasto->id}/comprobante", [
            'comprobante' => UploadedFile::fake()->image('dos.jpg'),
        ])->assertOk();

        // Tras el reemplazo solo queda el segundo
        $this->assertCount(1, Storage::disk('public')->files('uploads/comprobantes'));
    }

    /** @test */
    public function export_csv_devuelve_filas_filtradas_con_bom(): void
    {
        Gasto::factory()->create([
            'local_id' => $this->local->id,
            'categoria' => 'luz',
            'concepto'  => 'CFE',
            'monto_centavos' => 50000,
            'fecha' => now()->startOfMonth()->addDay(),
            'recurrente' => true,
            'notas' => null,
        ]);
        Gasto::factory()->create([
            'local_id' => $this->local->id,
            'categoria' => 'agua',
            'concepto'  => 'CONAGUA',
            'monto_centavos' => 30000,
            'fecha' => now()->startOfMonth()->addDays(2),
        ]);

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->get('/api/v1/gastos/export?mes='.now()->format('Y-m'))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $body = $resp->streamedContent();

        // BOM UTF-8 al inicio
        $this->assertStringStartsWith("\xEF\xBB\xBF", $body);
        // El header de la columna 4 tiene espacio → fputcsv lo escapa con quotes.
        $this->assertStringContainsString('Fecha,Categoría,Concepto,"Monto MXN",Recurrente,Notas,Comprobante', $body);
        $this->assertStringContainsString('luz,CFE,500.00', $body);
        $this->assertStringContainsString('agua,CONAGUA,300.00', $body);
    }

    /** @test */
    public function export_csv_filtra_por_categoria(): void
    {
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'luz']);
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'agua']);
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'agua']);

        Sanctum::actingAs($this->owner, ['*']);

        $body = $this->get('/api/v1/gastos/export?categoria=agua')
            ->assertOk()
            ->streamedContent();

        $this->assertStringNotContainsString(',luz,', $body);
        $this->assertSame(2, substr_count($body, ',agua,'));
    }

    /** @test */
    public function resumen_devuelve_total_y_breakdown_por_categoria(): void
    {
        // Mes actual: 2 gastos de luz + 1 de agua
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'luz', 'monto_centavos' => 100000, 'fecha' => now()->startOfMonth()->addDay()]);
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'luz', 'monto_centavos' => 50000,  'fecha' => now()->startOfMonth()->addDays(5)]);
        Gasto::factory()->create(['local_id' => $this->local->id, 'categoria' => 'agua','monto_centavos' => 30000,  'fecha' => now()->startOfMonth()->addDays(10)]);

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/gastos/resumen')->assertOk();

        $this->assertEquals(1800, $resp->json('data.total_mxn'));     // 180,000 centavos = $1800
        $cats = collect($resp->json('data.por_categoria'));
        $this->assertSame('luz', $cats->first()['categoria']);
        $this->assertEquals(1500, $cats->first()['total_mxn']);        // $1000 + $500
        $this->assertSame(2,      $cats->first()['cantidad']);
    }
}
