<?php

namespace Database\Factories;

use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\MovimientoInventario;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MovimientoInventario>
 */
class MovimientoInventarioFactory extends Factory
{
    protected $model = MovimientoInventario::class;

    public function definition(): array
    {
        $cantidad = $this->faker->randomFloat(3, 1, 50);

        return [
            'local_id'         => Local::factory(),
            'ingrediente_id'   => Ingrediente::factory(),
            'tipo'             => $this->faker->randomElement(['entrada', 'salida', 'ajuste', 'merma']),
            'cantidad'         => $cantidad,
            'stock_resultante' => $cantidad + $this->faker->randomFloat(3, 10, 200),
            'referencia'       => 'manual',
            'motivo'           => null,
            'user_id'          => null,
        ];
    }
}
