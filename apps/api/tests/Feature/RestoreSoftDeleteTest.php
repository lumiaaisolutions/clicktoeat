<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Compra;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RestoreSoftDeleteTest extends TestCase
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

    // ─── Productos ─────────────────────────────────────────────

    /** @test */
    public function index_productos_no_incluye_trashed_por_default(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Producto::factory()->paraLocal($this->local, $cat)->create(['nombre' => 'Vivo']);
        $deleted = Producto::factory()->paraLocal($this->local, $cat)->create(['nombre' => 'Borrado']);
        $deleted->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/productos')->assertOk();
        $this->assertCount(1, $resp->json('data'));
        $this->assertSame('Vivo', $resp->json('data.0.nombre'));
    }

    /** @test */
    public function index_productos_trashed_only_devuelve_solo_los_borrados(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Producto::factory()->paraLocal($this->local, $cat)->create(['nombre' => 'Vivo']);
        $deleted = Producto::factory()->paraLocal($this->local, $cat)->create(['nombre' => 'Borrado']);
        $deleted->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/productos?trashed=only')->assertOk();
        $this->assertCount(1, $resp->json('data'));
        $this->assertSame('Borrado', $resp->json('data.0.nombre'));
    }

    /** @test */
    public function index_productos_trashed_with_incluye_ambos(): void
    {
        $cat = Categoria::factory()->paraLocal($this->local)->create();
        Producto::factory()->paraLocal($this->local, $cat)->count(2)->create();
        $deleted = Producto::factory()->paraLocal($this->local, $cat)->create();
        $deleted->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $resp = $this->getJson('/api/v1/productos?trashed=with')->assertOk();
        $this->assertCount(3, $resp->json('data'));
    }

    /** @test */
    public function owner_restaura_su_producto(): void
    {
        $cat      = Categoria::factory()->paraLocal($this->local)->create();
        $producto = Producto::factory()->paraLocal($this->local, $cat)->create();
        $producto->delete();
        $this->assertSoftDeleted($producto);

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/productos/{$producto->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.id', $producto->id);

        $this->assertDatabaseHas('productos', [
            'id'         => $producto->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function owner_no_restaura_producto_de_otro_local(): void
    {
        $otroLocal = Local::factory()->create();
        $otroCat   = Categoria::factory()->paraLocal($otroLocal)->create();
        $producto  = Producto::factory()->paraLocal($otroLocal, $otroCat)->create();
        $producto->delete();

        Sanctum::actingAs($this->owner, ['*']);

        // 403 (policy) o 404 (TenantScope+withTrashed lo filtra) — ambos bloquean
        $status = $this->postJson("/api/v1/productos/{$producto->id}/restore")->status();
        $this->assertContains($status, [403, 404], "Esperaba 403 ó 404, recibí {$status}");
    }

    /** @test */
    public function staff_no_restaura(): void
    {
        $cat      = Categoria::factory()->paraLocal($this->local)->create();
        $producto = Producto::factory()->paraLocal($this->local, $cat)->create();
        $producto->delete();

        $staff = User::factory()->staff($this->local)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson("/api/v1/productos/{$producto->id}/restore")
            ->assertStatus(403);
    }

    // ─── Pedidos ───────────────────────────────────────────────

    /** @test */
    public function owner_restaura_su_pedido_soft_deleted(): void
    {
        $pedido = Pedido::factory()->paraLocal($this->local)->create();
        $pedido->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/pedidos/{$pedido->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.id', $pedido->id);

        $this->assertDatabaseHas('pedidos', [
            'id'         => $pedido->id,
            'deleted_at' => null,
        ]);
    }

    // ─── Compras ───────────────────────────────────────────────

    /** @test */
    public function owner_restaura_su_compra_soft_deleted(): void
    {
        $compra = Compra::factory()->paraLocal($this->local)->create();
        $compra->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/compras/{$compra->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.id', $compra->id);
    }

    // ─── Admin locales ─────────────────────────────────────────

    /** @test */
    public function super_admin_restaura_un_local(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $local      = Local::factory()->create();
        $local->delete();

        Sanctum::actingAs($superAdmin, ['*']);

        $this->postJson("/api/v1/admin/locales/{$local->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.id', $local->id);

        $this->assertDatabaseHas('locales', [
            'id'         => $local->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function owner_no_puede_restaurar_locales(): void
    {
        $local = Local::factory()->create();
        $local->delete();

        Sanctum::actingAs($this->owner, ['*']);

        $this->postJson("/api/v1/admin/locales/{$local->id}/restore")
            ->assertStatus(403);
    }
}
