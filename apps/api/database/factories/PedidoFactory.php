<?php

namespace Database\Factories;

use App\Models\Local;
use App\Models\Pedido;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pedido>
 */
class PedidoFactory extends Factory
{
    protected $model = Pedido::class;

    public function definition(): array
    {
        $subtotal     = $this->faker->randomFloat(2, 50, 800);
        $deliveryFee  = $this->faker->boolean() ? 35 : 0;
        $descuento    = 0;
        $total        = $subtotal + $deliveryFee - $descuento;

        return [
            'local_id'         => Local::factory(),
            'cliente_nombre'   => $this->faker->name(),
            'cliente_telefono' => '521'.$this->faker->numerify('##########'),
            'direccion'        => $deliveryFee > 0 ? $this->faker->address() : null,
            'notas'            => null,
            'metodo_entrega'   => $deliveryFee > 0 ? 'delivery' : 'pickup',
            'metodo_pago'      => $this->faker->randomElement([
                'efectivo', 'tarjeta_entrega', 'transferencia',
            ]),
            'subtotal'         => $subtotal,
            'delivery_fee'     => $deliveryFee,
            'descuento'        => $descuento,
            'total'            => $total,
            'estado'           => 'nuevo',
            'whatsapp_url'     => null,
            'confirmado_at'    => null,
            'entregado_at'     => null,
        ];
    }

    public function paraLocal(Local $local): static
    {
        return $this->state(fn () => ['local_id' => $local->id]);
    }

    public function conEstado(string $estado): static
    {
        return $this->state(fn () => array_filter([
            'estado'        => $estado,
            'confirmado_at' => in_array($estado, ['confirmado', 'preparando', 'listo', 'en_camino', 'entregado'], true) ? now() : null,
            'entregado_at'  => $estado === 'entregado' ? now() : null,
        ], fn ($v) => $v !== null || true));
    }

    public function entregado(): static
    {
        return $this->conEstado('entregado');
    }

    public function cancelado(): static
    {
        return $this->conEstado('cancelado');
    }

    public function delivery(): static
    {
        return $this->state(fn () => [
            'metodo_entrega' => 'delivery',
            'delivery_fee'   => 35,
            'direccion'      => $this->faker->address(),
        ]);
    }

    public function pickup(): static
    {
        return $this->state(fn () => [
            'metodo_entrega' => 'pickup',
            'delivery_fee'   => 0,
            'direccion'      => null,
        ]);
    }

    public function sucursal(): static
    {
        return $this->state(fn () => [
            'metodo_entrega' => 'sucursal',
            'metodo_pago'    => 'tarjeta_tpv',
            'delivery_fee'   => 0,
            'direccion'      => null,
            'cliente_nombre' => 'Mostrador',
        ]);
    }
}
