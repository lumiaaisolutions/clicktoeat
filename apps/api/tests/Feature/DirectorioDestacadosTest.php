<?php

namespace Tests\Feature;

use App\Models\Local;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Directorio público: solo los locales Premium salen `destacado` (primer plano).
 * Los demás solo aparecen al buscar por nombre o filtrar por cercanía (lógica de UI).
 */
class DirectorioDestacadosTest extends TestCase
{
    use RefreshDatabase;

    public function test_solo_premium_es_destacado(): void
    {
        // Usa los planes reales (premium incluye `directorio_destacado`).
        $this->seed(\Database\Seeders\PlansSeeder::class);

        $premium = Local::factory()->withPlan('premium')->create(['nombre' => 'Tienda Premium', 'activo' => true]);
        $essential = Local::factory()->withPlan('essential')->create(['nombre' => 'Tienda Básica', 'activo' => true]);

        $data = collect($this->getJson('/api/v1/public/locales')->assertOk()->json('data'));

        $this->assertTrue((bool) $data->firstWhere('slug', $premium->slug)['destacado']);
        $this->assertFalse((bool) $data->firstWhere('slug', $essential->slug)['destacado']);
    }
}
