<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Local;
use App\Models\Producto;
use App\Models\Receta;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Cliente demo: "Postres Stitch" — negocio de postres temático del personaje.
 *
 * Paleta inspirada en Stitch:
 *  - Primario:   #4FC3F7  (cyan Stitch)
 *  - Secundario: #1B3A5C  (azul marino — texto/contraste)
 *  - Fondo:      #E1F5FE  (panza de Stitch, crema clara)
 *
 * Vende pasteles por rebanada y frutas preparadas con chantilly (fresas, uvas,
 * duraznos, mix). Cada producto tiene receta enlazada a ingredientes para que
 * el inventario se descuente automáticamente con cada pedido.
 *
 * Owner: owner+postres-stitch@ClickToEat.app / password123
 *
 * Idempotente — re-correrlo actualiza en lugar de duplicar. Migra el local
 * antiguo "dulce-antojo" si existe (preserva productos, recetas y pedidos).
 */
class PostresStitchSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Migrar el local "dulce-antojo" anterior si existe — preserva id,
        //    productos, recetas y pedidos asociados.
        $localPrevio = Local::where('slug', 'dulce-antojo')->first();
        if ($localPrevio) {
            $localPrevio->update(['slug' => 'postres-stitch']);
            User::where('email', 'owner+dulce-antojo@ClickToEat.app')
                ->update(['email' => 'owner+postres-stitch@ClickToEat.app']);
        }

        $owner = User::updateOrCreate(
            ['email' => 'owner+postres-stitch@ClickToEat.app'],
            [
                'nombre'   => 'Owner Postres Stitch',
                'password' => Hash::make('password123'),
                'rol'      => 'owner',
                'email_verified_at' => now(),
            ],
        );

        $local = Local::updateOrCreate(
            ['slug' => 'postres-stitch'],
            [
                'nombre'              => 'Postres Stitch',
                'tagline'             => '¡Ohana significa familia, y familia merece postre! Rebanadas y frutas con chantilly.',
                'logo_url'            => null,
                'banner_url'          => null, // gradient del color primario en la card
                'color_primario'      => '#4FC3F7',  // cyan Stitch
                'color_secundario'    => '#1B3A5C',  // azul marino
                'color_fondo'         => '#E1F5FE',  // crema clara
                'tipografia'          => 'Bricolage Grotesque',
                'whatsapp'            => '5215544332211',
                'telefono'            => '5544332211',
                'email_contacto'      => 'hola@postresstitch.mx',
                'direccion'           => 'Av. Álvaro Obregón 145, Roma Nte., CDMX',
                'horarios'            => [
                    ['dia' => 'lun', 'open' => '11:00', 'close' => '21:00'],
                    ['dia' => 'mar', 'open' => '11:00', 'close' => '21:00'],
                    ['dia' => 'mie', 'open' => '11:00', 'close' => '21:00'],
                    ['dia' => 'jue', 'open' => '11:00', 'close' => '22:00'],
                    ['dia' => 'vie', 'open' => '11:00', 'close' => '23:00'],
                    ['dia' => 'sab', 'open' => '10:00', 'close' => '23:00'],
                    ['dia' => 'dom', 'open' => '10:00', 'close' => '21:00'],
                ],
                'delivery_fee'         => 39,
                'delivery_min_minutos' => 30,
                'redes_sociales'       => [
                    'ig' => 'postresstitch.mx',
                    'fb' => 'postresstitchMX',
                    'tt' => 'postresstitch',
                ],
                'activo'     => true,
                'suspendido' => false,
                'owner_id'   => $owner->id,
            ],
        );

        $owner->forceFill(['local_id' => $local->id])->save();

        // ── Categorías ───────────────────────────────────────────
        $cats = collect([
            ['slug' => 'pasteles',  'nombre' => 'Pasteles',            'icono' => 'fa-cake-candles'],
            ['slug' => 'frutas',    'nombre' => 'Frutas con chantilly','icono' => 'fa-bowl-food'],
            ['slug' => 'bebidas',   'nombre' => 'Bebidas',             'icono' => 'fa-mug-hot'],
        ])->map(fn ($c, $i) => Categoria::updateOrCreate(
            ['local_id' => $local->id, 'slug' => $c['slug']],
            ['nombre' => $c['nombre'], 'icono' => $c['icono'], 'orden' => $i, 'activo' => true],
        ))->keyBy('slug');

        // ── Productos ───────────────────────────────────────────
        $productos = collect([
            ['cat' => 'pasteles', 'slug' => 'rebanada-tres-leches',   'nombre' => 'Rebanada Tres Leches',
             'desc' => 'Bizcocho esponjoso bañado en tres tipos de leche, decorado con merengue y canela',
             'precio' => 85, 'img' => '1565958011703-44f9829ba187', 'tag' => 'Más pedido'],

            ['cat' => 'pasteles', 'slug' => 'rebanada-chocolate',     'nombre' => 'Rebanada de Chocolate',
             'desc' => 'Doble capa de chocolate semiamargo con ganache',
             'precio' => 95, 'img' => '1578985545062-69928b1d9587'],

            ['cat' => 'pasteles', 'slug' => 'rebanada-zanahoria',     'nombre' => 'Rebanada de Zanahoria',
             'desc' => 'Bizcocho de zanahoria con nuez y cubierta de queso crema',
             'precio' => 90, 'img' => '1571115177098-24ec42ed204d'],

            ['cat' => 'pasteles', 'slug' => 'rebanada-red-velvet',    'nombre' => 'Rebanada Red Velvet',
             'desc' => 'Clásico bizcocho rojo aterciopelado con frosting de queso crema',
             'precio' => 95, 'img' => '1586788224331-947f68671cf1', 'tag' => 'Nuevo'],

            ['cat' => 'pasteles', 'slug' => 'rebanada-cheesecake',    'nombre' => 'Rebanada de Cheesecake',
             'desc' => 'Cheesecake estilo NY sobre base de galleta, con coulis de frutos rojos',
             'precio' => 110, 'img' => '1533134242443-d4fd215305ad'],

            ['cat' => 'frutas',   'slug' => 'fresas-con-chantilly',   'nombre' => 'Fresas con chantilly',
             'desc' => 'Fresas frescas en tarrina con crema chantilly y un toque de leche condensada',
             'precio' => 75, 'img' => '1488477181946-6428a0291777', 'tag' => 'Favorito'],

            ['cat' => 'frutas',   'slug' => 'uvas-con-chantilly',     'nombre' => 'Uvas con chantilly',
             'desc' => 'Uvas verdes y rojas con crema chantilly batida al momento',
             'precio' => 70, 'img' => '1599819811279-d5ad9cccf838'],

            ['cat' => 'frutas',   'slug' => 'duraznos-con-chantilly', 'nombre' => 'Duraznos con chantilly',
             'desc' => 'Duraznos en almíbar con crema chantilly y nuez picada',
             'precio' => 75, 'img' => '1595376898787-91cea2566e2c'],

            ['cat' => 'frutas',   'slug' => 'mix-de-frutas',          'nombre' => 'Mix de frutas con chantilly',
             'desc' => 'Combinación de fresa, uva y durazno con chantilly — el favorito de Stitch',
             'precio' => 95, 'img' => '1490474504059-bf2db5ab2348', 'tag' => 'Especial'],

            ['cat' => 'bebidas',  'slug' => 'cafe-americano',         'nombre' => 'Café americano',
             'desc' => 'Café de especialidad recién extraído', 'precio' => 45,
             'img' => '1495474472287-4d71bcdd2085'],

            ['cat' => 'bebidas',  'slug' => 'chocolate-caliente',     'nombre' => 'Chocolate caliente',
             'desc' => 'Chocolate oscuro con leche entera y malvaviscos', 'precio' => 55,
             'img' => '1517578239113-b03992dcdd25'],

            ['cat' => 'bebidas',  'slug' => 'agua-de-jamaica',        'nombre' => 'Agua de jamaica',
             'desc' => 'Fresca, ligeramente endulzada con piloncillo', 'precio' => 35,
             'img' => '1556679343-c7306c1976bc'],
        ])->map(fn ($p, $i) => Producto::updateOrCreate(
            ['local_id' => $local->id, 'slug' => $p['slug']],
            [
                'categoria_id' => $cats[$p['cat']]->id,
                'nombre'       => $p['nombre'],
                'descripcion'  => $p['desc'],
                'precio'       => $p['precio'],
                'imagen_url'   => $this->img($p['img']),
                'disponible'   => true,
                'tag'          => $p['tag'] ?? null,
                'orden'        => $i,
            ],
        ))->keyBy('slug');

        // ── Ingredientes ───────────────────────────────────────
        $ing = collect([
            ['nombre' => 'Pastel tres leches entero', 'unidad' => 'pz', 'stock' => 6,    'stock_minimo' => 2,   'costo_unitario' => 320],
            ['nombre' => 'Pastel de chocolate entero','unidad' => 'pz', 'stock' => 5,    'stock_minimo' => 2,   'costo_unitario' => 380],
            ['nombre' => 'Pastel de zanahoria entero','unidad' => 'pz', 'stock' => 4,    'stock_minimo' => 2,   'costo_unitario' => 350],
            ['nombre' => 'Red Velvet entero',         'unidad' => 'pz', 'stock' => 4,    'stock_minimo' => 2,   'costo_unitario' => 380],
            ['nombre' => 'Cheesecake entero',         'unidad' => 'pz', 'stock' => 3,    'stock_minimo' => 1,   'costo_unitario' => 450],
            ['nombre' => 'Fresa',                     'unidad' => 'kg', 'stock' => 8,    'stock_minimo' => 1.5, 'costo_unitario' => 70],
            ['nombre' => 'Uva',                       'unidad' => 'kg', 'stock' => 6,    'stock_minimo' => 1,   'costo_unitario' => 80],
            ['nombre' => 'Durazno',                   'unidad' => 'kg', 'stock' => 5,    'stock_minimo' => 1,   'costo_unitario' => 60],
            ['nombre' => 'Crema chantilly',           'unidad' => 'l',  'stock' => 4,    'stock_minimo' => 0.5, 'costo_unitario' => 95],
            ['nombre' => 'Leche condensada',          'unidad' => 'l',  'stock' => 2,    'stock_minimo' => 0.5, 'costo_unitario' => 75],
            ['nombre' => 'Nuez picada',               'unidad' => 'kg', 'stock' => 1.5,  'stock_minimo' => 0.3, 'costo_unitario' => 220],
            ['nombre' => 'Tarrina 12 oz',             'unidad' => 'pz', 'stock' => 150,  'stock_minimo' => 20,  'costo_unitario' => 3.5],
            ['nombre' => 'Plato desechable',          'unidad' => 'pz', 'stock' => 200,  'stock_minimo' => 30,  'costo_unitario' => 2],
            ['nombre' => 'Cuchara desechable',        'unidad' => 'pz', 'stock' => 250,  'stock_minimo' => 30,  'costo_unitario' => 0.8],
            ['nombre' => 'Café en grano',             'unidad' => 'kg', 'stock' => 2,    'stock_minimo' => 0.5, 'costo_unitario' => 380],
            ['nombre' => 'Cocoa',                     'unidad' => 'kg', 'stock' => 1,    'stock_minimo' => 0.2, 'costo_unitario' => 280],
            ['nombre' => 'Leche',                     'unidad' => 'l',  'stock' => 6,    'stock_minimo' => 1,   'costo_unitario' => 28],
            ['nombre' => 'Flor de jamaica',           'unidad' => 'kg', 'stock' => 0.8,  'stock_minimo' => 0.2, 'costo_unitario' => 150],
            ['nombre' => 'Vaso 16 oz',                'unidad' => 'pz', 'stock' => 100,  'stock_minimo' => 20,  'costo_unitario' => 4],
        ])->map(fn ($i) => Ingrediente::updateOrCreate(
            ['local_id' => $local->id, 'nombre' => $i['nombre']],
            $i + ['activo' => true],
        ))->keyBy('nombre');

        // ── Recetas ────────────────────────────────────────────
        $this->receta($productos['rebanada-tres-leches'], [
            'Pastel tres leches entero' => 0.125,
            'Plato desechable'          => 1,
            'Cuchara desechable'        => 1,
        ], $ing);
        $this->receta($productos['rebanada-chocolate'], [
            'Pastel de chocolate entero' => 0.125,
            'Plato desechable'           => 1,
            'Cuchara desechable'         => 1,
        ], $ing);
        $this->receta($productos['rebanada-zanahoria'], [
            'Pastel de zanahoria entero' => 0.125,
            'Nuez picada'                => 0.005,
            'Plato desechable'           => 1,
            'Cuchara desechable'         => 1,
        ], $ing);
        $this->receta($productos['rebanada-red-velvet'], [
            'Red Velvet entero'   => 0.125,
            'Plato desechable'    => 1,
            'Cuchara desechable'  => 1,
        ], $ing);
        $this->receta($productos['rebanada-cheesecake'], [
            'Cheesecake entero'   => 0.125,
            'Plato desechable'    => 1,
            'Cuchara desechable'  => 1,
        ], $ing);

        $this->receta($productos['fresas-con-chantilly'], [
            'Fresa'              => 0.150,
            'Crema chantilly'    => 0.050,
            'Leche condensada'   => 0.020,
            'Tarrina 12 oz'      => 1,
            'Cuchara desechable' => 1,
        ], $ing);
        $this->receta($productos['uvas-con-chantilly'], [
            'Uva'                => 0.150,
            'Crema chantilly'    => 0.050,
            'Tarrina 12 oz'      => 1,
            'Cuchara desechable' => 1,
        ], $ing);
        $this->receta($productos['duraznos-con-chantilly'], [
            'Durazno'            => 0.150,
            'Crema chantilly'    => 0.050,
            'Nuez picada'        => 0.010,
            'Tarrina 12 oz'      => 1,
            'Cuchara desechable' => 1,
        ], $ing);
        $this->receta($productos['mix-de-frutas'], [
            'Fresa'              => 0.060,
            'Uva'                => 0.060,
            'Durazno'            => 0.060,
            'Crema chantilly'    => 0.060,
            'Tarrina 12 oz'      => 1,
            'Cuchara desechable' => 1,
        ], $ing);

        $this->receta($productos['cafe-americano'], [
            'Café en grano' => 0.018,
            'Vaso 16 oz'    => 1,
        ], $ing);
        $this->receta($productos['chocolate-caliente'], [
            'Cocoa'      => 0.020,
            'Leche'      => 0.250,
            'Vaso 16 oz' => 1,
        ], $ing);
        $this->receta($productos['agua-de-jamaica'], [
            'Flor de jamaica' => 0.010,
            'Vaso 16 oz'      => 1,
        ], $ing);
    }

    protected function receta(Producto $producto, array $items, $ingredientes): void
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

    protected function img(string $id, int $w = 800): string
    {
        return "https://images.unsplash.com/photo-{$id}?w={$w}&q=80&auto=format&fit=crop";
    }
}
