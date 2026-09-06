<?php

namespace Tests\Feature;

use App\Models\AuthCarouselSlide;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Carrusel de login/registro: CRUD super_admin + lectura pública de activos.
 */
class AuthCarouselTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        return User::create([
            'nombre' => 'Super', 'email' => 'super@test.local',
            'password' => Hash::make('password123'), 'rol' => 'super_admin',
        ]);
    }

    private function owner(): User
    {
        return User::create([
            'nombre' => 'Owner', 'email' => 'owner@test.local',
            'password' => Hash::make('password123'), 'rol' => 'owner',
        ]);
    }

    /** @test */
    public function publico_solo_devuelve_slides_activos_ordenados(): void
    {
        AuthCarouselSlide::create(['quote' => 'B', 'orden' => 2, 'activo' => true, 'tags' => ['x']]);
        AuthCarouselSlide::create(['quote' => 'A', 'orden' => 1, 'activo' => true]);
        AuthCarouselSlide::create(['quote' => 'Oculto', 'orden' => 0, 'activo' => false]);

        $data = $this->getJson('/api/v1/public/auth-carousel')->assertOk()->json('data');

        $this->assertCount(2, $data);
        $this->assertSame('A', $data[0]['quote']);
        $this->assertSame('B', $data[1]['quote']);
        $this->assertSame(['x'], $data[1]['tags']);
    }

    /** @test */
    public function super_admin_puede_crear_editar_y_borrar(): void
    {
        $admin = $this->superAdmin();

        $create = $this->actingAs($admin, 'sanctum')->postJson('/api/v1/admin/auth-carousel', [
            'quote' => 'Nuevo slide', 'source' => 'ClickToEat', 'tags' => ['Sin comisiones'],
        ])->assertCreated();

        $id = $create->json('data.id');
        $this->assertDatabaseHas('auth_carousel_slides', ['id' => $id, 'quote' => 'Nuevo slide']);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/v1/admin/auth-carousel/{$id}", [
            'quote' => 'Editado', 'activo' => false,
        ])->assertOk();
        $this->assertDatabaseHas('auth_carousel_slides', ['id' => $id, 'quote' => 'Editado', 'activo' => false]);

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/v1/admin/auth-carousel/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('auth_carousel_slides', ['id' => $id]);
    }

    /** @test */
    public function owner_no_puede_administrar_el_carrusel(): void
    {
        $this->actingAs($this->owner(), 'sanctum')
            ->postJson('/api/v1/admin/auth-carousel', ['quote' => 'x'])
            ->assertForbidden();
    }
}
