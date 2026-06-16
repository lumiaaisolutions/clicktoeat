<?php

namespace App\Services\ProductTemplates;

use App\Models\Categoria;
use App\Models\Local;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Precarga catálogo placeholder por giro al crear un local. Sólo corre si el
 * local todavía no tiene productos — idempotente y seguro de re-llamar.
 *
 * Los datos son editables después por el owner — sólo reducen la fricción
 * del "menú vacío" inicial.
 */
class ProductTemplatesService
{
    public function seedFor(Local $local, ?string $giro = null): int
    {
        $giro ??= $local->giro;
        if (! $giro) return 0;

        $catalog = self::CATALOGS[$giro] ?? null;
        if (! $catalog) return 0;

        // Idempotente: no piso productos existentes.
        if (Producto::query()->where('local_id', $local->id)->exists()) {
            return 0;
        }

        $created = 0;
        DB::transaction(function () use ($local, $catalog, &$created) {
            // Asegurar categorías
            $catMap = [];
            foreach ($catalog['categorias'] as $idx => $cat) {
                $c = Categoria::create([
                    'local_id' => $local->id,
                    'slug'     => Str::slug($cat['nombre']),
                    'nombre'   => $cat['nombre'],
                    'icono'    => $cat['icono'] ?? null,
                    'orden'    => $idx,
                    'activo'   => true,
                ]);
                $catMap[$cat['slug']] = $c->id;
            }

            // Productos
            foreach ($catalog['productos'] as $idx => $p) {
                Producto::create([
                    'local_id'     => $local->id,
                    'categoria_id' => $catMap[$p['categoria']] ?? null,
                    'slug'         => Str::slug($p['nombre']).'-'.Str::random(4),
                    'nombre'       => $p['nombre'],
                    'descripcion'  => $p['descripcion'] ?? null,
                    'precio'       => $p['precio'],
                    'imagen_url'   => null,
                    'tag'          => $p['tag'] ?? null,
                    'disponible'   => true,
                    'orden'        => $idx,
                ]);
                $created++;
            }
        });

        return $created;
    }

    public const GIROS = [
        'mexicana'   => 'Cocina mexicana',
        'italiana'   => 'Pizzería / italiana',
        'cafeteria'  => 'Cafetería',
        'sushi'      => 'Sushi / japonesa',
        'postres'    => 'Postres y repostería',
        'bar'        => 'Bar / coctelería',
        'vegan'      => 'Healthy / vegana',
        'pasteleria' => 'Pastelería',
    ];

    private const CATALOGS = [
        'mexicana' => [
            'categorias' => [
                ['slug' => 'tacos',     'nombre' => 'Tacos',     'icono' => '🌮'],
                ['slug' => 'bebidas',   'nombre' => 'Bebidas',   'icono' => '🥤'],
                ['slug' => 'extras',    'nombre' => 'Extras',    'icono' => '🌶'],
            ],
            'productos' => [
                ['categoria' => 'tacos',   'nombre' => 'Taco al Pastor',    'descripcion' => 'Pastor con piña, cebolla y cilantro.', 'precio' => 28, 'tag' => 'TOP'],
                ['categoria' => 'tacos',   'nombre' => 'Taco de Suadero',   'descripcion' => 'Suadero jugoso con limón.',             'precio' => 28],
                ['categoria' => 'tacos',   'nombre' => 'Taco Campechano',   'descripcion' => 'Mitad pastor, mitad suadero.',          'precio' => 32],
                ['categoria' => 'bebidas', 'nombre' => 'Agua de Horchata',  'descripcion' => 'Vaso 500ml.',                            'precio' => 25],
                ['categoria' => 'bebidas', 'nombre' => 'Refresco 600ml',    'descripcion' => 'Coca, Sprite o Fanta.',                  'precio' => 30],
                ['categoria' => 'extras',  'nombre' => 'Orden de Salsas',   'descripcion' => 'Verde, roja y guacamole.',               'precio' => 15],
                ['categoria' => 'extras',  'nombre' => 'Quesadilla',         'descripcion' => 'Tortilla de maíz con queso Oaxaca.',     'precio' => 35],
                ['categoria' => 'extras',  'nombre' => 'Frijoles Charros',   'descripcion' => 'Frijoles con chorizo y tocino.',         'precio' => 40],
            ],
        ],

        'italiana' => [
            'categorias' => [
                ['slug' => 'pizzas',  'nombre' => 'Pizzas',  'icono' => '🍕'],
                ['slug' => 'pastas',  'nombre' => 'Pastas',  'icono' => '🍝'],
                ['slug' => 'bebidas', 'nombre' => 'Bebidas', 'icono' => '🍷'],
            ],
            'productos' => [
                ['categoria' => 'pizzas',  'nombre' => 'Margherita',      'descripcion' => 'Salsa de tomate, mozzarella y albahaca.', 'precio' => 180, 'tag' => 'CLÁSICA'],
                ['categoria' => 'pizzas',  'nombre' => 'Pepperoni',        'descripcion' => 'Mozzarella y pepperoni italiano.',      'precio' => 195],
                ['categoria' => 'pizzas',  'nombre' => 'Cuatro Quesos',    'descripcion' => 'Mozzarella, gorgonzola, parmesano y manchego.', 'precio' => 220],
                ['categoria' => 'pastas',  'nombre' => 'Spaghetti Boloñesa', 'descripcion' => 'Salsa de carne lentamente cocida.',   'precio' => 160],
                ['categoria' => 'pastas',  'nombre' => 'Fettuccine Alfredo',  'descripcion' => 'Crema, mantequilla y parmesano.',     'precio' => 165],
                ['categoria' => 'pastas',  'nombre' => 'Lasagna',          'descripcion' => 'Capas de pasta, carne y bechamel.',     'precio' => 175],
                ['categoria' => 'bebidas', 'nombre' => 'Limonada Italiana','descripcion' => 'Limón fresco con menta.',                'precio' => 50],
                ['categoria' => 'bebidas', 'nombre' => 'Copa de Vino Tinto', 'descripcion' => 'Chianti DOCG.',                         'precio' => 95],
            ],
        ],

        'cafeteria' => [
            'categorias' => [
                ['slug' => 'cafe',      'nombre' => 'Café',      'icono' => '☕'],
                ['slug' => 'reposteria','nombre' => 'Repostería','icono' => '🥐'],
                ['slug' => 'desayuno',  'nombre' => 'Desayuno',  'icono' => '🍳'],
            ],
            'productos' => [
                ['categoria' => 'cafe',       'nombre' => 'Espresso',         'descripcion' => 'Doble shot 60ml.',                'precio' => 35],
                ['categoria' => 'cafe',       'nombre' => 'Cappuccino',        'descripcion' => 'Espresso con leche vaporizada.', 'precio' => 55, 'tag' => 'TOP'],
                ['categoria' => 'cafe',       'nombre' => 'Latte Vainilla',   'descripcion' => 'Espresso, leche y vainilla.',    'precio' => 65],
                ['categoria' => 'cafe',       'nombre' => 'Cold Brew',        'descripcion' => '12 horas de extracción en frío.','precio' => 60],
                ['categoria' => 'reposteria', 'nombre' => 'Croissant Mantequilla', 'descripcion' => 'Hojaldre francés.',         'precio' => 45],
                ['categoria' => 'reposteria', 'nombre' => 'Concha de Chocolate', 'descripcion' => 'Pan dulce tradicional.',       'precio' => 35],
                ['categoria' => 'desayuno',   'nombre' => 'Chilaquiles Verdes', 'descripcion' => 'Con pollo y crema.',            'precio' => 110],
                ['categoria' => 'desayuno',   'nombre' => 'Avocado Toast',     'descripcion' => 'Pan de masa madre, aguacate, huevo.', 'precio' => 95],
            ],
        ],

        'sushi' => [
            'categorias' => [
                ['slug' => 'rolls',    'nombre' => 'Rolls',     'icono' => '🍣'],
                ['slug' => 'sashimi',  'nombre' => 'Sashimi',   'icono' => '🐟'],
                ['slug' => 'extras',   'nombre' => 'Extras',    'icono' => '🍱'],
            ],
            'productos' => [
                ['categoria' => 'rolls',   'nombre' => 'California Roll',  'descripcion' => 'Cangrejo, pepino y aguacate.',  'precio' => 145, 'tag' => 'CLÁSICO'],
                ['categoria' => 'rolls',   'nombre' => 'Philadelphia Roll','descripcion' => 'Salmón, queso crema, pepino.',  'precio' => 165],
                ['categoria' => 'rolls',   'nombre' => 'Spicy Tuna Roll',  'descripcion' => 'Atún picante con sriracha.',     'precio' => 175],
                ['categoria' => 'sashimi', 'nombre' => 'Sashimi de Salmón', 'descripcion' => '8 piezas frescas.',             'precio' => 220],
                ['categoria' => 'sashimi', 'nombre' => 'Sashimi de Atún',  'descripcion' => '8 piezas de atún azul.',         'precio' => 240],
                ['categoria' => 'extras',  'nombre' => 'Edamames',         'descripcion' => 'Con sal de mar.',                'precio' => 65],
                ['categoria' => 'extras',  'nombre' => 'Sopa Miso',        'descripcion' => 'Caldo tradicional con tofu.',    'precio' => 55],
                ['categoria' => 'extras',  'nombre' => 'Té Verde',         'descripcion' => 'Sencha caliente.',                'precio' => 35],
            ],
        ],

        'postres' => [
            'categorias' => [
                ['slug' => 'pasteles', 'nombre' => 'Pasteles', 'icono' => '🎂'],
                ['slug' => 'helados',  'nombre' => 'Helados',  'icono' => '🍨'],
                ['slug' => 'bebidas',  'nombre' => 'Bebidas',  'icono' => '🥤'],
            ],
            'productos' => [
                ['categoria' => 'pasteles', 'nombre' => 'Tres Leches',       'descripcion' => 'Suave y húmedo.',                'precio' => 75, 'tag' => 'TOP'],
                ['categoria' => 'pasteles', 'nombre' => 'Cheesecake Frutos Rojos', 'descripcion' => 'Base de galleta y queso.', 'precio' => 85],
                ['categoria' => 'pasteles', 'nombre' => 'Brownie Nutella',    'descripcion' => 'Caliente con scoop de vainilla.', 'precio' => 95],
                ['categoria' => 'helados',  'nombre' => 'Helado Artesanal',   'descripcion' => 'Bola, elige sabor.',              'precio' => 55],
                ['categoria' => 'helados',  'nombre' => 'Banana Split',       'descripcion' => '3 sabores con plátano y crema.',  'precio' => 110],
                ['categoria' => 'bebidas',  'nombre' => 'Chocolate Caliente', 'descripcion' => 'Cacao 70%.',                       'precio' => 55],
                ['categoria' => 'bebidas',  'nombre' => 'Frappé Vainilla',    'descripcion' => 'Con crema batida.',                'precio' => 75],
                ['categoria' => 'bebidas',  'nombre' => 'Smoothie de Fresa',   'descripcion' => 'Yogurt natural y fresa.',          'precio' => 70],
            ],
        ],

        'bar' => [
            'categorias' => [
                ['slug' => 'cocteles', 'nombre' => 'Cócteles', 'icono' => '🍸'],
                ['slug' => 'cervezas', 'nombre' => 'Cervezas', 'icono' => '🍺'],
                ['slug' => 'snacks',   'nombre' => 'Snacks',   'icono' => '🥨'],
            ],
            'productos' => [
                ['categoria' => 'cocteles', 'nombre' => 'Margarita',          'descripcion' => 'Tequila, triple sec, limón.',    'precio' => 135, 'tag' => 'CLÁSICO'],
                ['categoria' => 'cocteles', 'nombre' => 'Mojito Cubano',      'descripcion' => 'Ron blanco, menta, limón, soda.', 'precio' => 130],
                ['categoria' => 'cocteles', 'nombre' => 'Negroni',            'descripcion' => 'Gin, Campari, vermut rojo.',     'precio' => 145],
                ['categoria' => 'cervezas', 'nombre' => 'Cerveza Artesanal',  'descripcion' => '355ml.',                          'precio' => 75],
                ['categoria' => 'cervezas', 'nombre' => 'Michelada',          'descripcion' => 'Cerveza, limón, sal, salsas.',    'precio' => 85],
                ['categoria' => 'snacks',   'nombre' => 'Alitas BBQ',         'descripcion' => '6 piezas con aderezo ranch.',     'precio' => 145],
                ['categoria' => 'snacks',   'nombre' => 'Nachos Supremos',    'descripcion' => 'Con queso, frijoles y jalapeño.', 'precio' => 125],
                ['categoria' => 'snacks',   'nombre' => 'Papas a la Francesa', 'descripcion' => 'Crujientes con sal de mar.',     'precio' => 75],
            ],
        ],

        'vegan' => [
            'categorias' => [
                ['slug' => 'bowls',  'nombre' => 'Bowls',  'icono' => '🥗'],
                ['slug' => 'wraps',  'nombre' => 'Wraps',  'icono' => '🌯'],
                ['slug' => 'jugos',  'nombre' => 'Jugos',  'icono' => '🥤'],
            ],
            'productos' => [
                ['categoria' => 'bowls', 'nombre' => 'Buddha Bowl',         'descripcion' => 'Quinoa, garbanzos, kale, tahini.', 'precio' => 145, 'tag' => 'TOP'],
                ['categoria' => 'bowls', 'nombre' => 'Bowl de Acai',        'descripcion' => 'Acai, granola, frutos del bosque.', 'precio' => 135],
                ['categoria' => 'bowls', 'nombre' => 'Poke Vegano',         'descripcion' => 'Tofu, edamame, mango, arroz integral.', 'precio' => 155],
                ['categoria' => 'wraps', 'nombre' => 'Wrap Mediterráneo',   'descripcion' => 'Hummus, falafel, ensalada.',        'precio' => 110],
                ['categoria' => 'wraps', 'nombre' => 'Wrap de Aguacate',    'descripcion' => 'Aguacate, jitomate, lechuga, brotes.', 'precio' => 105],
                ['categoria' => 'jugos', 'nombre' => 'Green Detox',         'descripcion' => 'Kale, manzana, jengibre, limón.',   'precio' => 75],
                ['categoria' => 'jugos', 'nombre' => 'Antioxidante',        'descripcion' => 'Betabel, zanahoria, naranja.',     'precio' => 70],
                ['categoria' => 'jugos', 'nombre' => 'Smoothie de Plátano', 'descripcion' => 'Plátano, leche de almendra, cacao.', 'precio' => 80],
            ],
        ],

        'pasteleria' => [
            'categorias' => [
                ['slug' => 'tortas',     'nombre' => 'Tortas',      'icono' => '🎂'],
                ['slug' => 'panaderia',  'nombre' => 'Panadería',   'icono' => '🥖'],
                ['slug' => 'galletas',   'nombre' => 'Galletas',    'icono' => '🍪'],
            ],
            'productos' => [
                ['categoria' => 'tortas',     'nombre' => 'Pastel de Cumpleaños', 'descripcion' => 'Personalizado, 8-10 personas.', 'precio' => 450, 'tag' => 'PEDIDO'],
                ['categoria' => 'tortas',     'nombre' => 'Red Velvet',           'descripcion' => 'Rebanada con queso crema.',      'precio' => 75],
                ['categoria' => 'tortas',     'nombre' => 'Selva Negra',          'descripcion' => 'Chocolate y cereza.',            'precio' => 85],
                ['categoria' => 'panaderia',  'nombre' => 'Baguette',             'descripcion' => 'Pan francés.',                   'precio' => 55],
                ['categoria' => 'panaderia',  'nombre' => 'Pan de Muerto',         'descripcion' => 'Tradicional, temporada.',        'precio' => 65],
                ['categoria' => 'galletas',   'nombre' => 'Chispas de Chocolate',  'descripcion' => 'Galleta XL.',                    'precio' => 28],
                ['categoria' => 'galletas',   'nombre' => 'Polvorón',              'descripcion' => 'Tradicional mexicano.',          'precio' => 25],
                ['categoria' => 'galletas',   'nombre' => 'Macarons (6)',           'descripcion' => 'Surtido de sabores.',            'precio' => 145],
            ],
        ],
    ];
}
