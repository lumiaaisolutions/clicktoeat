<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnuncioGlobal extends Model
{
    protected $table = 'anuncios_globales';

    protected $fillable = [
        'titulo', 'body', 'severity', 'active', 'show_to_super',
        'starts_at', 'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'active'        => 'boolean',
            'show_to_super' => 'boolean',
            'starts_at'     => 'datetime',
            'ends_at'       => 'datetime',
        ];
    }

    public function isVisibleNow(): bool
    {
        if (! $this->active) return false;
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) return false;
        if ($this->ends_at   && $now->gt($this->ends_at))   return false;
        return true;
    }
}
