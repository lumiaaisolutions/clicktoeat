<?php

namespace Database\Factories;

use App\Models\Gasto;
use App\Models\Local;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Gasto>
 */
class GastoFactory extends Factory
{
    protected $model = Gasto::class;

    public function definition(): array
    {
        return [
            'local_id'       => Local::factory(),
            'categoria'      => fake()->randomElement(Gasto::CATEGORIAS),
            'concepto'       => fake()->sentence(3),
            'monto_centavos' => fake()->numberBetween(10000, 5000000), // $100 — $50,000 MXN
            'fecha'          => fake()->dateTimeBetween('-2 months', 'now'),
            'recurrente'     => fake()->boolean(30),
            'notas'          => null,
        ];
    }
}
