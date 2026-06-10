<?php

namespace Database\Seeders;

use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use App\Models\Receta;
use Illuminate\Database\Seeder;

/**
 * Crea ingredientes + recetas demo para tacos-el-gordo.
 * El primer producto (Taco al Pastor) queda con receta para que la Fase 3
 * pueda demostrar el descuento automático de inventario.
 */
class InventarioSeeder extends Seeder
{
    public function run(): void
    {
        $local = Local::where('slug', 'tacos-el-gordo')->first();
        if (! $local) {
            return;
        }

        // ── Ingredientes ────────────────────────────────────────
        $ingredientes = collect([
            ['nombre' => 'Tortilla maíz',     'unidad' => 'pz', 'stock' => 1000, 'stock_minimo' => 100, 'costo_unitario' => 1.5],
            ['nombre' => 'Tortilla harina',   'unidad' => 'pz', 'stock' => 500,  'stock_minimo' => 50,  'costo_unitario' => 3.0],
            ['nombre' => 'Carne al pastor',   'unidad' => 'kg', 'stock' => 25,   'stock_minimo' => 5,   'costo_unitario' => 220.0],
            ['nombre' => 'Carne suadero',     'unidad' => 'kg', 'stock' => 15,   'stock_minimo' => 3,   'costo_unitario' => 200.0],
            ['nombre' => 'Piña',              'unidad' => 'pz', 'stock' => 30,   'stock_minimo' => 5,   'costo_unitario' => 25.0],
            ['nombre' => 'Cebolla',           'unidad' => 'kg', 'stock' => 8,    'stock_minimo' => 1,   'costo_unitario' => 30.0],
            ['nombre' => 'Cilantro',          'unidad' => 'kg', 'stock' => 4,    'stock_minimo' => 0.5, 'costo_unitario' => 60.0],
            ['nombre' => 'Limón',             'unidad' => 'pz', 'stock' => 200,  'stock_minimo' => 20,  'costo_unitario' => 1.5],
        ])->map(function ($data) use ($local) {
            return Ingrediente::updateOrCreate(
                ['local_id' => $local->id, 'nombre' => $data['nombre']],
                $data + ['activo' => true],
            );
        })->keyBy('nombre');

        // ── Recetas ────────────────────────────────────────────
        // 1 Taco al Pastor consume:
        //   - 1 tortilla de maíz
        //   - 0.080 kg de carne al pastor
        //   - 0.010 kg de cebolla
        //   - 0.010 kg de cilantro
        //   - 1 trozo de piña (idealizado a 1 pz / 20 tacos → 0.05)
        $tacoPastor = Producto::where('local_id', $local->id)
            ->where('slug', 'taco-al-pastor')
            ->first();

        if ($tacoPastor) {
            $this->setReceta($tacoPastor, [
                'Tortilla maíz'   => 1,
                'Carne al pastor' => 0.080,
                'Cebolla'         => 0.010,
                'Cilantro'        => 0.010,
                'Piña'            => 0.05,
            ], $ingredientes);
        }

        $tacoSuadero = Producto::where('local_id', $local->id)
            ->where('slug', 'taco-de-suadero')
            ->first();

        if ($tacoSuadero) {
            $this->setReceta($tacoSuadero, [
                'Tortilla maíz' => 1,
                'Carne suadero' => 0.080,
                'Cebolla'       => 0.010,
                'Cilantro'      => 0.010,
            ], $ingredientes);
        }
    }

    protected function setReceta(Producto $producto, array $items, $ingredientes): void
    {
        Receta::where('producto_id', $producto->id)->delete();
        foreach ($items as $nombre => $cantidad) {
            $ing = $ingredientes->get($nombre);
            if (! $ing) continue;
            Receta::create([
                'producto_id'    => $producto->id,
                'ingrediente_id' => $ing->id,
                'cantidad'       => $cantidad,
            ]);
        }
    }
}
