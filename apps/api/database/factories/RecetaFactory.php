<?php

namespace Database\Factories;

use App\Models\Ingrediente;
use App\Models\Producto;
use App\Models\Receta;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Receta>
 */
class RecetaFactory extends Factory
{
    protected $model = Receta::class;

    public function definition(): array
    {
        return [
            'producto_id'             => Producto::factory(),
            'ingrediente_id'          => Ingrediente::factory(),
            'componente_producto_id'  => null,
            'cantidad'                => $this->faker->randomFloat(3, 0.001, 5),
        ];
    }

    public function paraProductoYIngrediente(Producto $producto, Ingrediente $ingrediente, float $cantidad = 1): static
    {
        return $this->state(fn () => [
            'producto_id'    => $producto->id,
            'ingrediente_id' => $ingrediente->id,
            'componente_producto_id' => null,
            'cantidad'       => $cantidad,
        ]);
    }

    public function paraProductoYComponente(Producto $producto, Producto $componente, float $cantidad = 1): static
    {
        return $this->state(fn () => [
            'producto_id'             => $producto->id,
            'ingrediente_id'          => null,
            'componente_producto_id'  => $componente->id,
            'cantidad'                => $cantidad,
        ]);
    }
}
