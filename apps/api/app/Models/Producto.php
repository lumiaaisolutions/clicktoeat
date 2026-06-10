<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producto extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $table = 'productos';

    protected $fillable = [
        'local_id', 'categoria_id',
        'nombre', 'slug', 'descripcion',
        'precio', 'precio_descuento',
        'imagen_url', 'imagen_public_id',
        'disponible', 'es_combo', 'es_promocion',
        'tag', 'extras', 'meta', 'orden',
    ];

    protected function casts(): array
    {
        return [
            'precio'           => 'decimal:2',
            'precio_descuento' => 'decimal:2',
            'disponible'       => 'boolean',
            'es_combo'         => 'boolean',
            'es_promocion'     => 'boolean',
            'extras'           => 'array',
            'meta'             => 'array',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function recetas(): HasMany
    {
        return $this->hasMany(Receta::class);
    }
}
