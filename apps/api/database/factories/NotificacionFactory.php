<?php

namespace Database\Factories;

use App\Models\Local;
use App\Models\Notificacion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notificacion>
 */
class NotificacionFactory extends Factory
{
    protected $model = Notificacion::class;

    public function definition(): array
    {
        return [
            'local_id' => Local::factory(),
            'tipo'     => 'bajo_stock',
            'titulo'   => 'Bajo stock: '.$this->faker->word(),
            'mensaje'  => $this->faker->sentence(),
            'data'     => null,
            'leida_at' => null,
        ];
    }

    public function leida(): static
    {
        return $this->state(fn () => ['leida_at' => now()]);
    }

    public function bajoStock(int $ingredienteId, float $stock, float $stockMinimo, string $unidad = 'pz'): static
    {
        return $this->state(fn () => [
            'tipo'    => 'bajo_stock',
            'titulo'  => "Bajo stock",
            'mensaje' => "Quedan {$stock} {$unidad}",
            'data'    => [
                'ingrediente_id' => $ingredienteId,
                'stock'          => $stock,
                'stock_minimo'   => $stockMinimo,
                'unidad'         => $unidad,
            ],
        ]);
    }
}
