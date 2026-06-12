<?php

namespace Database\Factories;

use App\Models\Compra;
use App\Models\DetalleCompra;
use App\Models\Ingrediente;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DetalleCompra>
 */
class DetalleCompraFactory extends Factory
{
    protected $model = DetalleCompra::class;

    public function definition(): array
    {
        $cantidad = $this->faker->randomFloat(3, 1, 50);
        $costo    = $this->faker->randomFloat(2, 5, 200);

        return [
            'compra_id'      => Compra::factory(),
            'ingrediente_id' => Ingrediente::factory(),
            'cantidad'       => $cantidad,
            'costo_unitario' => $costo,
            'subtotal'       => round($cantidad * $costo, 2),
        ];
    }
}
