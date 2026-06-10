<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seed inicial — porta tacos-el-gordo y pizza-bambino del prototipo
 * (apps/legacy-prototype/data.jsx) a la base real para que la landing pública
 * funcione end-to-end desde el primer `docker compose up`.
 */
class LocalesSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedLocal($this->tacosElGordo());
        $this->seedLocal($this->pizzaBambino());
    }

    protected function seedLocal(array $config): void
    {
        $ownerEmail = "owner+{$config['slug']}@ClickToEat.app";

        $owner = User::updateOrCreate(
            ['email' => $ownerEmail],
            [
                'nombre'   => "Owner {$config['nombre']}",
                'password' => Hash::make('password123'),
                'rol'      => 'owner',
                'email_verified_at' => now(),
            ],
        );

        $local = Local::updateOrCreate(
            ['slug' => $config['slug']],
            [
                'nombre'              => $config['nombre'],
                'tagline'             => $config['tagline'],
                'logo_url'            => $config['logo_url'] ?? null,
                'banner_url'          => $config['hero'],
                'color_primario'      => $config['color_primario'],
                'color_secundario'    => $config['color_secundario'] ?? '#0B0B0F',
                'color_fondo'         => $config['color_fondo'] ?? '#FAFAF7',
                'tipografia'          => $config['tipografia'] ?? 'Bricolage Grotesque',
                'whatsapp'            => $config['whatsapp'],
                'direccion'           => $config['direccion'],
                'horarios'            => $config['horarios'],
                'delivery_fee'        => $config['delivery_fee'],
                'delivery_min_minutos' => $config['delivery_min'],
                'redes_sociales'      => $config['socials'],
                'activo'              => true,
                'owner_id'            => $owner->id,
            ],
        );

        $owner->forceFill(['local_id' => $local->id])->save();

        $categoriaIdsPorSlug = [];
        foreach ($config['categorias'] as $i => $cat) {
            $row = Categoria::updateOrCreate(
                ['local_id' => $local->id, 'slug' => $cat['slug']],
                [
                    'nombre' => $cat['nombre'],
                    'icono'  => $cat['icono'] ?? null,
                    'orden'  => $i,
                    'activo' => true,
                ],
            );
            $categoriaIdsPorSlug[$cat['slug']] = $row->id;
        }

        foreach ($config['productos'] as $i => $prod) {
            Producto::updateOrCreate(
                ['local_id' => $local->id, 'slug' => Str::slug($prod['nombre'])],
                [
                    'categoria_id'  => $categoriaIdsPorSlug[$prod['categoria']],
                    'nombre'        => $prod['nombre'],
                    'descripcion'   => $prod['descripcion'],
                    'precio'        => $prod['precio'],
                    'imagen_url'    => $prod['imagen'],
                    'disponible'    => $prod['disponible'] ?? true,
                    'tag'           => $prod['tag'] ?? null,
                    'extras'        => $prod['extras'] ?? null,
                    'orden'         => $i,
                ],
            );
        }
    }

    protected function img(string $id, int $w = 800): string
    {
        return "https://images.unsplash.com/photo-{$id}?w={$w}&q=80&auto=format&fit=crop";
    }

    protected function tacosElGordo(): array
    {
        return [
            'slug'           => 'tacos-el-gordo',
            'nombre'         => 'Tacos El Gordo',
            'tagline'        => 'Tacos al pastor, suadero y campechanos hechos al carbón',
            'color_primario' => '#FF2D2D',
            'color_secundario' => '#0B0B0F',
            'whatsapp'       => '5215512345678',
            'direccion'      => 'Av. Insurgentes Sur 432, Roma Nte., CDMX',
            'delivery_fee'   => 35,
            'delivery_min'   => 25,
            'hero'           => $this->img('1565299585323-38d6b0865b47', 1200),
            'socials'        => ['ig' => 'tacoselgordo', 'fb' => 'tacoselgordoMX', 'tt' => 'tacoselgordo'],
            'horarios'       => [
                ['dia' => 'lun', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'mar', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'mie', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'jue', 'open' => '12:00', 'close' => '23:00'],
                ['dia' => 'vie', 'open' => '12:00', 'close' => '00:00'],
                ['dia' => 'sab', 'open' => '12:00', 'close' => '00:00'],
                ['dia' => 'dom', 'open' => '12:00', 'close' => '22:00'],
            ],
            'categorias' => [
                ['slug' => 'tacos',    'nombre' => 'Tacos',    'icono' => 'fa-pepper-hot'],
                ['slug' => 'gringas',  'nombre' => 'Gringas',  'icono' => 'fa-cheese'],
                ['slug' => 'extras',   'nombre' => 'Extras',   'icono' => 'fa-bowl-food'],
                ['slug' => 'bebidas',  'nombre' => 'Bebidas',  'icono' => 'fa-bottle-water'],
                ['slug' => 'postres',  'nombre' => 'Postres',  'icono' => 'fa-ice-cream'],
            ],
            'productos' => [
                ['categoria' => 'tacos', 'nombre' => 'Taco al Pastor', 'descripcion' => 'Cerdo marinado al trompo, piña, cebolla y cilantro', 'precio' => 28, 'imagen' => $this->img('1599974579688-8dbdd335c77f'), 'tag' => 'Más pedido', 'extras' => [
                    ['group' => 'Tortilla', 'kind' => 'one', 'required' => true, 'items' => [
                        ['id' => 'maiz',   'name' => 'Maíz',   'price' => 0],
                        ['id' => 'harina', 'name' => 'Harina', 'price' => 5],
                    ]],
                    ['group' => 'Salsas', 'kind' => 'many', 'items' => [
                        ['id' => 's1', 'name' => 'Verde tatemada',     'price' => 0],
                        ['id' => 's2', 'name' => 'Roja molcajeteada',  'price' => 0],
                        ['id' => 's3', 'name' => 'Habanero',           'price' => 0],
                    ]],
                    ['group' => 'Extras', 'kind' => 'many', 'items' => [
                        ['id' => 'q', 'name' => 'Queso fundido', 'price' => 12],
                        ['id' => 'g', 'name' => 'Guacamole',     'price' => 18],
                        ['id' => 'a', 'name' => 'Aguacate',      'price' => 10],
                    ]],
                ]],
                ['categoria' => 'tacos',   'nombre' => 'Taco de Suadero',         'descripcion' => 'Suadero confitado en su propia grasa, cebolla, cilantro', 'precio' => 26, 'imagen' => $this->img('1551504734-5ee1c4a1479b')],
                ['categoria' => 'tacos',   'nombre' => 'Taco Campechano',         'descripcion' => 'Mezcla de chorizo y bistec, con queso opcional', 'precio' => 32, 'imagen' => $this->img('1565299543923-37dd37887442'), 'tag' => 'Picante'],
                ['categoria' => 'gringas', 'nombre' => 'Gringa al Pastor',        'descripcion' => 'Doble tortilla de harina, pastor, queso gratinado, piña', 'precio' => 78, 'imagen' => $this->img('1604467794349-0b74285de7e7')],
                ['categoria' => 'gringas', 'nombre' => 'Quesadilla Suadero',      'descripcion' => 'Tortilla de harina con queso Oaxaca y suadero', 'precio' => 65, 'imagen' => $this->img('1633504581786-316c8002b1b9'), 'disponible' => false],
                ['categoria' => 'extras',  'nombre' => 'Guacamole con totopos',   'descripcion' => 'Aguacate, jitomate, cilantro, limón y chile serrano', 'precio' => 55, 'imagen' => $this->img('1541544181051-e46607bc22a4')],
                ['categoria' => 'extras',  'nombre' => 'Frijoles charros',        'descripcion' => 'Frijoles bayos con tocino, chorizo y chiles toreados', 'precio' => 45, 'imagen' => $this->img('1543339308-43e59d6b73a6')],
                ['categoria' => 'bebidas', 'nombre' => 'Agua de Horchata',        'descripcion' => 'Receta de la casa, canela y vainilla', 'precio' => 35, 'imagen' => $this->img('1572213426852-0e4ed8f41ed2')],
                ['categoria' => 'bebidas', 'nombre' => 'Coca Cola de vidrio',     'descripcion' => '355 ml, bien fría', 'precio' => 28, 'imagen' => $this->img('1622483767028-3f66f32aef97')],
                ['categoria' => 'postres', 'nombre' => 'Churros con cajeta',      'descripcion' => '6 piezas, azúcar canela y cajeta quemada', 'precio' => 48, 'imagen' => $this->img('1624374797037-c104b1f04ca5')],
            ],
        ];
    }

    protected function pizzaBambino(): array
    {
        return [
            'slug'           => 'pizza-bambino',
            'nombre'         => 'Pizza Bambino',
            'tagline'        => 'Pizza napolitana de leña, fermentación 72h',
            'color_primario' => '#D2691E',
            'color_secundario' => '#1F1A17',
            'whatsapp'       => '5215587654321',
            'direccion'      => 'Calle Orizaba 87, Roma Nte., CDMX',
            'delivery_fee'   => 45,
            'delivery_min'   => 30,
            'hero'           => $this->img('1604068549290-dea0e4a305ca', 1200),
            'socials'        => ['ig' => 'pizzabambino', 'fb' => 'pizzabambinoMX'],
            'horarios'       => [
                ['dia' => 'mar', 'open' => '13:00', 'close' => '23:00'],
                ['dia' => 'mie', 'open' => '13:00', 'close' => '23:00'],
                ['dia' => 'jue', 'open' => '13:00', 'close' => '23:00'],
                ['dia' => 'vie', 'open' => '13:00', 'close' => '00:00'],
                ['dia' => 'sab', 'open' => '13:00', 'close' => '00:00'],
                ['dia' => 'dom', 'open' => '13:00', 'close' => '22:00'],
            ],
            'categorias' => [
                ['slug' => 'pizzas',    'nombre' => 'Pizzas',    'icono' => 'fa-pizza-slice'],
                ['slug' => 'pastas',    'nombre' => 'Pastas',    'icono' => 'fa-utensils'],
                ['slug' => 'ensaladas', 'nombre' => 'Ensaladas', 'icono' => 'fa-leaf'],
                ['slug' => 'bebidas',   'nombre' => 'Bebidas',   'icono' => 'fa-wine-glass'],
                ['slug' => 'postres',   'nombre' => 'Postres',   'icono' => 'fa-cake-candles'],
            ],
            'productos' => [
                ['categoria' => 'pizzas', 'nombre' => 'Margherita',       'descripcion' => 'San Marzano DOP, fior di latte, albahaca fresca, aceite de oliva', 'precio' => 220, 'imagen' => $this->img('1574071318508-1cdbab80d002'), 'tag' => 'Clásica'],
                ['categoria' => 'pizzas', 'nombre' => 'Bambino Special',  'descripcion' => 'Salami picante, miel de trufa, fior di latte, parmesano', 'precio' => 285, 'imagen' => $this->img('1565299624946-b28f40a0ae38'), 'tag' => 'Más pedida'],
                ['categoria' => 'pizzas', 'nombre' => 'Quattro Formaggi', 'descripcion' => 'Mozzarella, gorgonzola, parmesano, taleggio', 'precio' => 265, 'imagen' => $this->img('1513104890138-7c749659a591')],
                ['categoria' => 'pastas', 'nombre' => 'Cacio e Pepe',     'descripcion' => 'Tonnarelli al huevo, pecorino romano, pimienta negra', 'precio' => 195, 'imagen' => $this->img('1551183053-bf91a1d81141')],
                ['categoria' => 'pastas', 'nombre' => 'Carbonara',        'descripcion' => 'Guanciale, yema de huevo, pecorino romano, pimienta', 'precio' => 215, 'imagen' => $this->img('1612874742237-6526221588e3')],
                ['categoria' => 'ensaladas', 'nombre' => 'Caprese di Bufala', 'descripcion' => 'Mozzarella de búfala, jitomate cherry, albahaca, aceite de Liguria', 'precio' => 175, 'imagen' => $this->img('1607532941433-304659e8198a')],
                ['categoria' => 'bebidas', 'nombre' => 'Limonada de Sicilia', 'descripcion' => 'Limón siciliano, romero y agua mineral', 'precio' => 65, 'imagen' => $this->img('1556881286-fc6915169721')],
                ['categoria' => 'bebidas', 'nombre' => 'Copa de Chianti',     'descripcion' => 'Chianti Classico DOCG, 150 ml', 'precio' => 145, 'imagen' => $this->img('1510812431401-41d2bd2722f3')],
                ['categoria' => 'postres', 'nombre' => 'Tiramisú',            'descripcion' => 'Mascarpone, café espresso, cacao Valrhona', 'precio' => 95, 'imagen' => $this->img('1571877227200-a0d98ea607e9')],
            ],
        ];
    }
}
