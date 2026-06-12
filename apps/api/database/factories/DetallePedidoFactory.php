<?php

namespace Database\Factories;

use App\Models\DetallePedido;
use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DetallePedido>
 */
class DetallePedidoFactory extends Factory
{
    protected $model = DetallePedido::class;

    public function definition(): array
    {
        $cantidad = $this->faker->numberBetween(1, 5);
        $precio   = $this->faker->randomFloat(2, 20, 100);

        return [
            'pedido_id'             => Pedido::factory(),
            'producto_id'           => Producto::factory(),
            'producto_nombre'       => $this->faker->words(3, true),
            'precio_unitario'       => $precio,
            'cantidad'              => $cantidad,
            'subtotal'              => $precio * $cantidad,
            'extras_seleccionados'  => null,
            'notas'                 => null,
        ];
    }
}
