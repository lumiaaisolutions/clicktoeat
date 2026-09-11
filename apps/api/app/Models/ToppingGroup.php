<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

/**
 * Grupo de opciones reutilizable (topping). Ver migración topping_groups.
 * `items` es un array de { name, price }. Al usarse en un producto se copia a
 * su columna `extras` (snapshot), sin acoplar el producto a este catálogo.
 */
class ToppingGroup extends Model
{
    use BelongsToTenant;

    protected $table = 'topping_groups';

    protected $fillable = ['local_id', 'nombre', 'kind', 'required', 'items', 'activo'];

    protected function casts(): array
    {
        return [
            'required' => 'boolean',
            'activo' => 'boolean',
            'items' => 'array',
        ];
    }
}
