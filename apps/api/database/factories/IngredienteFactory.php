<?php

namespace Database\Factories;

use App\Models\Ingrediente;
use App\Models\Local;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ingrediente>
 */
class IngredienteFactory extends Factory
{
    protected $model = Ingrediente::class;

    public function definition(): array
    {
        return [
            'local_id'       => Local::factory(),
            'nombre'         => $this->faker->randomElement([
                'Tortilla maíz', 'Tortilla harina', 'Pollo', 'Res', 'Cerdo',
                'Tomate', 'Cebolla', 'Cilantro', 'Limón', 'Aguacate',
                'Queso', 'Lechuga', 'Pepino', 'Aceite',
            ]).' '.$this->faker->numerify('##'),
            'stock'          => $this->faker->randomFloat(3, 50, 1000),
            'stock_minimo'   => $this->faker->randomFloat(3, 5, 50),
            'unidad'         => $this->faker->randomElement(['pz', 'kg', 'g', 'l', 'ml']),
            'costo_unitario' => $this->faker->randomFloat(2, 0.50, 100),
            'activo'         => true,
        ];
    }

    public function paraLocal(Local $local): static
    {
        return $this->state(fn () => ['local_id' => $local->id]);
    }

    public function sinStock(): static
    {
        return $this->state(fn () => ['stock' => 0]);
    }

    public function bajoStock(): static
    {
        return $this->state(fn () => [
            'stock'        => 5,
            'stock_minimo' => 10,
        ]);
    }

    public function conStock(float $stock, ?string $unidad = null): static
    {
        return $this->state(fn () => array_filter([
            'stock'  => $stock,
            'unidad' => $unidad,
        ]));
    }

    public function inactivo(): static
    {
        return $this->state(fn () => ['activo' => false]);
    }
}
