<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Slide del carrusel de login/registro. Configuración global de plataforma
 * (super_admin) — NO usa BelongsToTenant.
 */
class AuthCarouselSlide extends Model
{
    protected $fillable = [
        'orden', 'activo', 'imagen_url', 'tags', 'quote', 'source', 'role',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'tags' => 'array',
            'orden' => 'integer',
        ];
    }
}
