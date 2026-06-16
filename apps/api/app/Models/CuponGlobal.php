<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CuponGlobal extends Model
{
    protected $table = 'cupones_globales';

    protected $fillable = [
        'codigo', 'descripcion', 'tipo', 'valor',
        'min_subtotal', 'max_usos_por_local', 'aplicar_nuevos',
        'vigente_desde', 'vigente_hasta',
    ];

    protected function casts(): array
    {
        return [
            'valor'          => 'decimal:2',
            'min_subtotal'   => 'decimal:2',
            'aplicar_nuevos' => 'boolean',
            'vigente_desde'  => 'date',
            'vigente_hasta'  => 'date',
        ];
    }
}
