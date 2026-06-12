<?php

namespace Database\Factories;

use App\Models\Compra;
use App\Models\Local;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Compra>
 */
class CompraFactory extends Factory
{
    protected $model = Compra::class;

    public function definition(): array
    {
        $subtotal  = $this->faker->randomFloat(2, 100, 5000);
        $impuestos = round($subtotal * 0.16, 2);

        return [
            'local_id'           => Local::factory(),
            'proveedor'          => $this->faker->company(),
            'referencia_factura' => 'F-'.$this->faker->numerify('####'),
            'fecha'              => now()->toDateString(),
            'subtotal'           => $subtotal,
            'impuestos'          => $impuestos,
            'total'              => $subtotal + $impuestos,
            'notas'              => null,
            'estado'             => 'registrada',
            'user_id'            => null,
        ];
    }

    public function paraLocal(Local $local): static
    {
        return $this->state(fn () => ['local_id' => $local->id]);
    }

    public function anulada(): static
    {
        return $this->state(fn () => ['estado' => 'anulada']);
    }
}
