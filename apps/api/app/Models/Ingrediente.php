<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ingrediente extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'ingredientes';

    protected $fillable = [
        'local_id', 'nombre', 'stock', 'stock_minimo',
        'unidad', 'costo_unitario', 'activo',
    ];

    protected function casts(): array
    {
        return [
            'stock'           => 'decimal:3',
            'stock_minimo'    => 'decimal:3',
            'costo_unitario'  => 'decimal:2',
            'activo'          => 'boolean',
        ];
    }

    public function recetas(): HasMany
    {
        return $this->hasMany(Receta::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoInventario::class);
    }
}
