<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $slug
 * @property string $nombre
 * @property int $precio_mxn_centavos
 * @property string|null $stripe_price_id
 * @property array $features
 * @property int|null $max_productos
 * @property int|null $max_categorias
 * @property int|null $max_staff
 * @property bool $activo
 * @property int $orden
 */
class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug', 'nombre',
        'precio_mxn_centavos', 'stripe_price_id',
        'features',
        'max_productos', 'max_categorias', 'max_staff',
        'activo', 'orden',
    ];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'activo'   => 'boolean',
        ];
    }

    public function locales(): HasMany
    {
        return $this->hasMany(Local::class);
    }

    public function priceMxn(): float
    {
        return $this->precio_mxn_centavos / 100;
    }

    public function hasFeature(string $key): bool
    {
        return in_array($key, $this->features ?? [], true);
    }
}
