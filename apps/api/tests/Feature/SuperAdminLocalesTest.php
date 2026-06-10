<?php

namespace Tests\Feature;

use App\Models\Local;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminLocalesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $owner;
    protected Local $localOwner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'nombre'   => 'Super Admin',
            'email'    => 'admin@test.local',
            'password' => Hash::make('password123'),
            'rol'      => 'super_admin',
        ]);

        $this->localOwner = Local::create([
            'nombre' => 'Tacos Test', 'slug' => 'tacos-test', 'whatsapp' => '5215512345678',
            'color_primario' => '#FF2D2D', 'color_secundario' => '#0B0B0F', 'color_fondo' => '#FAFAF7',
            'tipografia' => 'sans', 'activo' => true,
        ]);

        $this->owner = User::create([
            'nombre' => 'Owner', 'email' => 'owner@test.local',
            'password' => Hash::make('password123'), 'rol' => 'owner',
            'local_id' => $this->localOwner->id,
        ]);
    }

    /** @test */
    public function super_admin_ve_todos_los_locales(): void
    {
        Local::create([
            'nombre' => 'Otro', 'slug' => 'otro', 'whatsapp' => '5215599999999',
            'color_primario' => '#000', 'color_secundario' => '#fff', 'color_fondo' => '#fff',
            'tipografia' => 'sans', 'activo' => true,
        ]);

        $resp = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/locales');

        $resp->assertOk()->assertJsonCount(2, 'data');
    }

    /** @test */
    public function owner_no_puede_acceder_al_endpoint_super_admin(): void
    {
        $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/admin/locales')
            ->assertStatus(403);
    }

    /** @test */
    public function super_admin_crea_un_local_con_owner_en_la_misma_request(): void
    {
        $resp = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/locales', [
                'nombre'         => 'Quesadillas Doña Cleo',
                'whatsapp'       => '5215511223344',
                'tagline'        => 'Las mejores de la colonia',
                'color_primario' => '#FFD700',
                'delivery_fee'   => 25,
                'owner' => [
                    'nombre'                 => 'Doña Cleo',
                    'email'                  => 'cleo@example.com',
                    'password'               => 'segura1234',
                    'password_confirmation'  => 'segura1234',
                ],
            ]);

        $resp->assertCreated()
            ->assertJsonPath('data.slug', 'quesadillas-dona-cleo')
            ->assertJsonPath('data.color_primario', '#FFD700');

        $this->assertDatabaseHas('locales', ['slug' => 'quesadillas-dona-cleo']);
        $this->assertDatabaseHas('users',   ['email' => 'cleo@example.com', 'rol' => 'owner']);
    }

    /** @test */
    public function rechaza_slug_duplicado(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/locales', [
                'nombre'   => 'Tacos Test 2',
                'slug'     => 'tacos-test',
                'whatsapp' => '5215511223344',
            ])
            ->assertStatus(422)
            ->assertJsonPath('errors.slug.0', fn ($msg) => str_contains($msg, 'taken') || str_contains($msg, 'tomado') || str_contains($msg, 'used'));
    }

    /** @test */
    public function super_admin_actualiza_branding_de_cualquier_local(): void
    {
        $resp = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/locales/{$this->localOwner->id}", [
                'color_primario' => '#123456',
                'tagline'        => 'Reanimado',
            ]);

        $resp->assertOk()
            ->assertJsonPath('data.color_primario', '#123456')
            ->assertJsonPath('data.tagline',        'Reanimado');
    }

    /** @test */
    public function super_admin_suspende_y_reactiva_un_local(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/locales/{$this->localOwner->id}/suspender")
            ->assertOk()
            ->assertJsonPath('data.suspendido', true);

        $this->assertTrue((bool) $this->localOwner->fresh()->suspendido);

        // El endpoint público debe rechazar locales suspendidos
        $this->getJson("/api/v1/public/menu/{$this->localOwner->slug}")
            ->assertNotFound();

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/locales/{$this->localOwner->id}/reactivar")
            ->assertOk()
            ->assertJsonPath('data.suspendido', false);

        $this->getJson("/api/v1/public/menu/{$this->localOwner->slug}")
            ->assertOk();
    }

    /** @test */
    public function super_admin_borra_local_soft_delete(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/locales/{$this->localOwner->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('locales', ['id' => $this->localOwner->id]);
    }
}
