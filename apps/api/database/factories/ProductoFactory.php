<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use App\Models\Receta;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Producto>
 */
class ProductoFactory extends Factory
{
    protected $model = Producto::class;

    public function definition(): array
    {
        $nombre = ucfirst($this->faker->words(2, true)).' '.$this->faker->numerify('##');

        return [
            'local_id'     => Local::factory(),
            'categoria_id' => Categoria::factory(),
            'nombre'       => $nombre,
            'slug'         => Str::slug($nombre),
            'descripcion'  => $this->faker->sentence(10),
            'precio'       => $this->faker->randomFloat(2, 20, 250),
            'precio_descuento' => null,
            'imagen_url'   => null,
            'imagen_public_id' => null,
            'disponible'   => true,
            'es_combo'     => false,
            'es_promocion' => false,
            'tag'          => null,
            'extras'       => null,
            'orden'        => $this->faker->numberBetween(0, 100),
        ];
    }

    public function paraLocal(Local $local, ?Categoria $categoria = null): static
    {
        return $this->state(fn () => [
            'local_id'     => $local->id,
            'categoria_id' => $categoria?->id
                ?? Categoria::factory()->paraLocal($local)->create()->id,
        ]);
    }

    public function noDisponible(): static
    {
        return $this->state(fn () => ['disponible' => false]);
    }

    public function conDescuento(float $precio = 40, float $descuento = 30): static
    {
        return $this->state(fn () => [
            'precio'           => $precio,
            'precio_descuento' => $descuento,
        ]);
    }

    public function conExtras(): static
    {
        return $this->state(fn () => [
            'extras' => [
                [
                    'group' => 'Tortilla',
                    'kind' => 'one',
                    'required' => true,
                    'items' => [
                        ['id' => 'maiz',   'name' => 'Maíz',   'price' => 0],
                        ['id' => 'harina', 'name' => 'Harina', 'price' => 5],
                    ],
                ],
                [
                    'group' => 'Salsas',
                    'kind' => 'many',
                    'required' => false,
                    'items' => [
                        ['id' => 'verde',    'name' => 'Verde',    'price' => 0],
                        ['id' => 'roja',     'name' => 'Roja',     'price' => 0],
                        ['id' => 'habanero', 'name' => 'Habanero', 'price' => 0],
                    ],
                ],
            ],
        ]);
    }

    /**
     * Crea producto con receta que consume el ingrediente dado.
     * Útil para tests de descuento automático de inventario.
     */
    public function conReceta(Ingrediente $ingrediente, float $cantidad = 1): static
    {
        return $this->afterCreating(function (Producto $producto) use ($ingrediente, $cantidad) {
            Receta::create([
                'producto_id'    => $producto->id,
                'ingrediente_id' => $ingrediente->id,
                'cantidad'       => $cantidad,
            ]);
        });
    }
}
