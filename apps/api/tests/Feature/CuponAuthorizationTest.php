<?php

namespace Tests\Feature;

use App\Models\Cupon;
use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * SEV-12 del audit 2026-06-19 — autorización cross-tenant en CuponController.
 *
 * Antes el controller confiaba en TenantScope. Ahora `$this->authorize()` +
 * `CuponPolicy` agregan la segunda red. Estos tests verifican que un owner
 * no puede leer/modificar cupones de OTRO local incluso si conoce el ID.
 */
class CuponAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Local $localA;
    private Local $localB;
    private User $ownerA;
    private User $ownerB;
    private Cupon $cuponB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->localA = Local::factory()->create();
        $this->ownerA = User::factory()->owner($this->localA)->create();

        $this->localB = Local::factory()->create();
        $this->ownerB = User::factory()->owner($this->localB)->create();

        // Cupon que pertenece al local B
        $this->cuponB = Cupon::create([
            'local_id' => $this->localB->id,
            'codigo'   => 'CUPONB',
            'tipo'     => 'percent',
            'valor'    => 10,
            'activo'   => true,
        ]);
    }

    /** @test */
    public function owner_no_puede_ver_cupon_de_otro_local(): void
    {
        Sanctum::actingAs($this->ownerA, ['*']);

        // La policy CuponPolicy::view rechaza cross-tenant → 403.
        // (En producción el TenantScope global también filtra para que el
        // cupon ajeno NI siquiera sea visible vía route binding, pero
        // la policy es la segunda capa que confirma el bloqueo.)
        $this->getJson("/api/v1/cupones/{$this->cuponB->id}")
            ->assertForbidden();
    }

    /** @test */
    public function owner_no_puede_actualizar_cupon_de_otro_local(): void
    {
        Sanctum::actingAs($this->ownerA, ['*']);

        $this->patchJson("/api/v1/cupones/{$this->cuponB->id}", [
            'codigo' => 'HACKED',
            'tipo'   => 'fixed',
            'valor'  => 999,
        ])->assertForbidden();

        // Confirmar que el cupon original NO se modificó
        $this->assertDatabaseHas('cupones', [
            'id'     => $this->cuponB->id,
            'codigo' => 'CUPONB',
            'valor'  => 10,
        ]);
    }

    /** @test */
    public function owner_no_puede_borrar_cupon_de_otro_local(): void
    {
        Sanctum::actingAs($this->ownerA, ['*']);

        $this->deleteJson("/api/v1/cupones/{$this->cuponB->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('cupones', ['id' => $this->cuponB->id]);
    }

    /** @test */
    public function owner_no_puede_toggle_cupon_de_otro_local(): void
    {
        Sanctum::actingAs($this->ownerA, ['*']);

        $this->postJson("/api/v1/cupones/{$this->cuponB->id}/toggle")
            ->assertForbidden();

        $this->assertDatabaseHas('cupones', [
            'id'     => $this->cuponB->id,
            'activo' => true,   // sin cambio
        ]);
    }

    /** @test */
    public function owner_solo_lista_cupones_de_su_local(): void
    {
        // Crear 2 cupones del local A
        Cupon::create(['local_id' => $this->localA->id, 'codigo' => 'A1', 'tipo' => 'fixed', 'valor' => 10]);
        Cupon::create(['local_id' => $this->localA->id, 'codigo' => 'A2', 'tipo' => 'fixed', 'valor' => 20]);

        Sanctum::actingAs($this->ownerA, ['*']);

        $resp = $this->getJson('/api/v1/cupones')->assertOk();

        // Solo los 2 cupones de A — el de B no aparece
        $this->assertCount(2, $resp->json('data'));
        foreach ($resp->json('data') as $c) {
            $this->assertSame($this->localA->id, $c['local_id']);
        }
    }

    /** @test */
    public function staff_no_puede_crear_cupon(): void
    {
        $staff = User::factory()->staff($this->localA)->create();
        Sanctum::actingAs($staff, ['*']);

        $this->postJson('/api/v1/cupones', [
            'codigo' => 'TEST',
            'tipo'   => 'fixed',
            'valor'  => 50,
        ])->assertForbidden();
    }

    /** @test */
    public function super_admin_puede_ver_cupon_de_cualquier_local(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        Sanctum::actingAs($superAdmin, ['*']);

        // El `before` de la policy bypassa para super_admin.
        // TenantScope no filtra porque super_admin no tiene context seteado
        // (el middleware EnforceTenantScope hace bypass).
        // Seguridad: super_admin NO debe ser bloqueado por la policy (200 ≠ 403).
        // El shape de la respuesta tiene un quirk de serialización separado
        // documentado en docs/issues/2026-06-22-super-admin-empty-cupon-response.md
        // — bug funcional, NO afecta esta claim de seguridad.
        $this->getJson("/api/v1/cupones/{$this->cuponB->id}")
            ->assertOk();
    }
}
