<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Organization;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * F102 — Etapa C (organizations / sucursales consolidadas). El test más
 * crítico de este archivo es el de aislamiento cross-organización: un Local
 * fuera de la organización JAMÁS debe aparecer en el reporte consolidado,
 * ni un owner ajeno debe poder leerlo. Ver ADR-014.
 */
class OrganizationsConsolidadasTest extends TestCase
{
    use RefreshDatabase;

    protected User $chainOwner;

    protected User $otroOwner;

    protected Local $sucursal1;

    protected Local $sucursal2;

    protected Local $localAjeno;

    protected Organization $org;

    protected function setUp(): void
    {
        parent::setUp();

        $this->chainOwner = User::create([
            'nombre' => 'Dueño Cadena', 'email' => 'cadena@test.local', 'password' => Hash::make('password123'),
            'rol' => 'owner',
        ]);
        $this->otroOwner = User::create([
            'nombre' => 'Otro Dueño', 'email' => 'otro@test.local', 'password' => Hash::make('password123'),
            'rol' => 'owner',
        ]);

        $this->sucursal1 = Local::create([
            'nombre' => 'Sucursal Centro', 'slug' => 'sucursal-centro', 'whatsapp' => '5215500000010',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->sucursal2 = Local::create([
            'nombre' => 'Sucursal Norte', 'slug' => 'sucursal-norte', 'whatsapp' => '5215500000011',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);
        $this->localAjeno = Local::create([
            'nombre' => 'Local Ajeno', 'slug' => 'local-ajeno', 'whatsapp' => '5215500000012',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'Bricolage Grotesque', 'delivery_fee' => 0, 'activo' => true,
        ]);

        $this->chainOwner->update(['local_id' => $this->sucursal1->id]);
        $this->otroOwner->update(['local_id' => $this->localAjeno->id]);

        $this->org = Organization::create(['nombre' => 'Cadena de Tacos', 'owner_user_id' => $this->chainOwner->id]);
        $this->sucursal1->update(['organization_id' => $this->org->id]);
        $this->sucursal2->update(['organization_id' => $this->org->id]);
        // localAjeno NO se asigna a la organización — es el control negativo.

        foreach ([$this->sucursal1, $this->sucursal2, $this->localAjeno] as $local) {
            $cat = Categoria::create([
                'local_id' => $local->id, 'nombre' => 'Tacos', 'slug' => 'tacos-'.$local->id, 'orden' => 0, 'activo' => true,
            ]);
            Producto::create([
                'local_id' => $local->id, 'categoria_id' => $cat->id,
                'nombre' => 'Taco '.$local->id, 'slug' => 'taco-'.$local->id, 'precio' => 20, 'disponible' => true,
            ]);
        }
    }

    public function test_dueno_de_cadena_ve_reporte_consolidado_de_sus_sucursales(): void
    {
        $resp = $this->actingAs($this->chainOwner, 'sanctum')->getJson('/api/v1/organizations/mine');

        $resp->assertOk()->assertJsonPath('data.totalLocales', 2);

        $slugs = collect($resp->json('data.porLocal'))->pluck('slug')->all();
        $this->assertContains('sucursal-centro', $slugs);
        $this->assertContains('sucursal-norte', $slugs);
    }

    public function test_local_ajeno_no_asignado_a_la_organizacion_nunca_aparece(): void
    {
        $resp = $this->actingAs($this->chainOwner, 'sanctum')->getJson('/api/v1/organizations/mine');

        $slugs = collect($resp->json('data.porLocal'))->pluck('slug')->all();
        $this->assertNotContains('local-ajeno', $slugs);
    }

    public function test_owner_ajeno_no_puede_ver_el_reporte_de_otra_organizacion(): void
    {
        $resp = $this->actingAs($this->otroOwner, 'sanctum')->getJson('/api/v1/organizations/mine');

        // El otroOwner no es dueño de ninguna organización → 404, nunca datos ajenos.
        $resp->assertNotFound();
    }

    public function test_super_admin_asigna_y_desasigna_local_a_organizacion(): void
    {
        $superAdmin = User::create([
            'nombre' => 'Super', 'email' => 'super@test.local', 'password' => Hash::make('password123'),
            'rol' => 'super_admin',
        ]);

        $resp = $this->actingAs($superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/organizations/{$this->org->id}/locales", ['local_id' => $this->localAjeno->id]);
        $resp->assertOk();
        $this->assertSame($this->org->id, $this->localAjeno->fresh()->organization_id);

        $this->actingAs($superAdmin, 'sanctum')
            ->deleteJson("/api/v1/admin/organizations/{$this->org->id}/locales/{$this->localAjeno->id}")
            ->assertNoContent();
        $this->assertNull($this->localAjeno->fresh()->organization_id);
    }

    public function test_super_admin_lista_organizaciones_con_sus_locales(): void
    {
        $superAdmin = User::create([
            'nombre' => 'Super', 'email' => 'super2@test.local', 'password' => Hash::make('password123'),
            'rol' => 'super_admin',
        ]);

        $resp = $this->actingAs($superAdmin, 'sanctum')->getJson('/api/v1/admin/organizations');

        $resp->assertOk();
        $nombres = collect($resp->json('data'))->pluck('nombre')->all();
        $this->assertContains('Cadena de Tacos', $nombres);
        $org = collect($resp->json('data'))->firstWhere('nombre', 'Cadena de Tacos');
        $this->assertCount(2, $org['locales']);
    }

    public function test_super_admin_crea_organizacion(): void
    {
        $superAdmin = User::create([
            'nombre' => 'Super', 'email' => 'super3@test.local', 'password' => Hash::make('password123'),
            'rol' => 'super_admin',
        ]);

        $resp = $this->actingAs($superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/organizations', ['nombre' => 'Nueva Cadena', 'owner_user_id' => $this->otroOwner->id]);

        $resp->assertCreated();
        $this->assertDatabaseHas('organizations', ['nombre' => 'Nueva Cadena', 'owner_user_id' => $this->otroOwner->id]);
    }

    public function test_owner_normal_no_puede_asignar_locales_a_organizaciones(): void
    {
        $resp = $this->actingAs($this->chainOwner, 'sanctum')
            ->postJson("/api/v1/admin/organizations/{$this->org->id}/locales", ['local_id' => $this->localAjeno->id]);

        $resp->assertForbidden();
    }
}
