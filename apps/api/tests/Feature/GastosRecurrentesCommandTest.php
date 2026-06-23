<?php

namespace Tests\Feature;

use App\Models\Gasto;
use App\Models\Local;
use App\Models\Notificacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GastosRecurrentesCommandTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function notifica_cuando_gasto_recurrente_lleva_mas_de_35_dias_sin_registrarse(): void
    {
        $local = Local::factory()->create();

        Gasto::factory()->create([
            'local_id'   => $local->id,
            'categoria'  => 'renta',
            'concepto'   => 'Renta del local',
            'recurrente' => true,
            'fecha'      => now()->subDays(40),
        ]);

        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);

        $this->assertDatabaseHas('notificaciones', [
            'local_id' => $local->id,
            'tipo'     => 'gasto_recurrente_pendiente',
            'titulo'   => 'Gasto pendiente: Renta del local',
        ]);
    }

    /** @test */
    public function no_notifica_si_el_gasto_recurrente_esta_al_dia(): void
    {
        $local = Local::factory()->create();

        Gasto::factory()->create([
            'local_id'   => $local->id,
            'categoria'  => 'renta',
            'concepto'   => 'Renta del local',
            'recurrente' => true,
            'fecha'      => now()->subDays(10),  // recent → ok
        ]);

        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);

        $this->assertDatabaseMissing('notificaciones', [
            'local_id' => $local->id,
            'tipo'     => 'gasto_recurrente_pendiente',
        ]);
    }

    /** @test */
    public function no_duplica_notificacion_en_7_dias(): void
    {
        $local = Local::factory()->create();

        Gasto::factory()->create([
            'local_id'   => $local->id,
            'categoria'  => 'renta',
            'concepto'   => 'Renta del local',
            'recurrente' => true,
            'fecha'      => now()->subDays(40),
        ]);

        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);
        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);
        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);

        $this->assertSame(1, Notificacion::query()
            ->where('local_id', $local->id)
            ->where('tipo', 'gasto_recurrente_pendiente')
            ->count());
    }

    /** @test */
    public function ignora_gastos_no_recurrentes(): void
    {
        $local = Local::factory()->create();

        Gasto::factory()->create([
            'local_id'   => $local->id,
            'categoria'  => 'mantenimiento',
            'concepto'   => 'Reparación sillas',
            'recurrente' => false,
            'fecha'      => now()->subDays(60),
        ]);

        $this->artisan('gastos:check-recurrentes')->assertExitCode(0);

        $this->assertDatabaseMissing('notificaciones', [
            'local_id' => $local->id,
            'tipo'     => 'gasto_recurrente_pendiente',
        ]);
    }
}
