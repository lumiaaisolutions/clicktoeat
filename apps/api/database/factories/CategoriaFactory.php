<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\Local;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Categoria>
 */
class CategoriaFactory extends Factory
{
    protected $model = Categoria::class;

    public function definition(): array
    {
        $nombre = $this->faker->randomElement([
            'Entradas', 'Tacos', 'Pizzas', 'Hamburguesas', 'Pastas',
            'Postres', 'Bebidas', 'Especiales del chef', 'Menú infantil',
        ]).' '.$this->faker->numerify('##');

        return [
            'local_id' => Local::factory(),
            'nombre'   => $nombre,
            'slug'     => Str::slug($nombre),
            'icono'    => 'fa-utensils',
            'orden'    => $this->faker->numberBetween(0, 100),
            'activo'   => true,
        ];
    }

    public function paraLocal(Local $local): static
    {
        return $this->state(fn () => ['local_id' => $local->id]);
    }

    public function inactiva(): static
    {
        return $this->state(fn () => ['activo' => false]);
    }
}
