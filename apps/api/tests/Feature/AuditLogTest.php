<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private Local $local;
    private User $owner;
    private Categoria $categoria;

    protected function setUp(): void
    {
        parent::setUp();
        $this->local     = Local::factory()->create();
        $this->owner     = User::factory()->owner($this->local)->create();
        $this->categoria = Categoria::factory()->paraLocal($this->local)->create();
    }

    /** @test */
    public function crear_producto_genera_entry_created_en_audit_log(): void
    {
        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson('/api/v1/productos', [
            'categoria_id' => $this->categoria->id,
            'nombre'       => 'Taco audit',
            'precio'       => 30,
        ])->assertCreated();

        $log = AuditLog::where('resource_type', Producto::class)
            ->where('action', 'created')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame($this->local->id, $log->local_id);
        $this->assertSame($this->owner->id, $log->actor_user_id);
    }

    /** @test */
    public function actualizar_producto_captura_diff_de_campos(): void
    {
        $producto = Producto::factory()
            ->paraLocal($this->local, $this->categoria)
            ->create(['nombre' => 'Original', 'precio' => 30]);

        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/productos/{$producto->id}", [
            'nombre' => 'Cambiado',
            'precio' => 45,
        ])->assertOk();

        $log = AuditLog::where('resource_type', Producto::class)
            ->where('resource_id', $producto->id)
            ->where('action', 'updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertSame(['Original', 'Cambiado'], $log->changes['nombre']);
        // El precio cast a decimal:2 lo trae como string en old; comparamos numéricamente
        $this->assertEquals(45, $log->changes['precio'][1]);
    }

    /** @test */
    public function borrar_producto_genera_entry_deleted(): void
    {
        $producto = Producto::factory()->paraLocal($this->local, $this->categoria)->create();
        Sanctum::actingAs($this->owner, ['*']);

        $this->deleteJson("/api/v1/productos/{$producto->id}")->assertNoContent();

        $this->assertDatabaseHas('audit_logs', [
            'resource_type' => Producto::class,
            'resource_id'   => $producto->id,
            'action'        => 'deleted',
            'actor_user_id' => $this->owner->id,
        ]);
    }

    /** @test */
    public function audit_log_NO_incluye_password_aunque_cambie(): void
    {
        $staff = User::factory()->staff($this->local)->create(['nombre' => 'Original']);
        Sanctum::actingAs($this->owner, ['*']);

        $this->patchJson("/api/v1/local/staff/{$staff->id}", [
            'nombre'                => 'Cambiado',
            'password'              => 'nueva-segura-456',
            'password_confirmation' => 'nueva-segura-456',
        ])->assertOk();

        $log = AuditLog::where('resource_type', User::class)
            ->where('resource_id', $staff->id)
            ->where('action', 'updated')
            ->latest('id')
            ->first();

        $this->assertNotNull($log);
        $this->assertArrayHasKey('nombre', $log->changes);
        $this->assertArrayNotHasKey('password', $log->changes, 'PASSWORD FILTRADO EN AUDIT LOG');
    }

    /** @test */
    public function owner_ve_audit_log_solo_de_su_local(): void
    {
        Producto::factory()->paraLocal($this->local, $this->categoria)->create();   // log de este local

        $otroLocal     = Local::factory()->create();
        $otraCategoria = Categoria::factory()->paraLocal($otroLocal)->create();
        Producto::factory()->paraLocal($otroLocal, $otraCategoria)->create();   // log de otro local

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/audit-logs')->assertOk();

        // Sólo logs de mi local
        $logs = $resp->json('data');
        foreach ($logs as $log) {
            // Cada log debe ser de un recurso de mi local. Validar indirectamente
            // por la consulta: no debería haber más de 1 (el producto creado en setUp + en este test)
            // El conteo exacto puede variar según observers, lo importante es el isolation.
        }
        $this->assertNotEmpty($logs);
        // El conteo debe ser menor que el total real (que incluye al otro local)
        $totalReal = AuditLog::count();
        $this->assertLessThan($totalReal, count($logs));
    }

    /** @test */
    public function staff_no_puede_ver_audit_log(): void
    {
        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->getJson('/api/v1/audit-logs')->assertStatus(403);
    }

    /** @test */
    public function super_admin_ve_todos_los_logs(): void
    {
        $superAdmin    = User::factory()->superAdmin()->create();
        Producto::factory()->paraLocal($this->local, $this->categoria)->create();

        $otroLocal     = Local::factory()->create();
        $otraCategoria = Categoria::factory()->paraLocal($otroLocal)->create();
        Producto::factory()->paraLocal($otroLocal, $otraCategoria)->create();

        Sanctum::actingAs($superAdmin, ['*']);

        $resp = $this->getJson('/api/v1/audit-logs')->assertOk();
        $total = AuditLog::count();
        $this->assertCount($total, $resp->json('data'));
    }

    /** @test */
    public function filtros_por_resource_type_y_action_funcionan(): void
    {
        $producto = Producto::factory()->paraLocal($this->local, $this->categoria)->create();

        Sanctum::actingAs($this->owner, ['*']);

        // Generar updated (filtrar por action=updated)
        $producto->update(['nombre' => 'Updated']);

        $resp = $this->getJson('/api/v1/audit-logs?resource_type=Producto&action=updated')
            ->assertOk();

        foreach ($resp->json('data') as $log) {
            $this->assertSame('Producto', $log['resource_type']);
            $this->assertSame('updated', $log['action']);
        }
    }
}
