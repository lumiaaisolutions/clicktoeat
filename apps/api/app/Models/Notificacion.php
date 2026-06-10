<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notificacion extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'notificaciones';

    protected $fillable = [
        'local_id', 'tipo', 'titulo', 'mensaje', 'data', 'leida_at',
    ];

    protected function casts(): array
    {
        return [
            'data'      => 'array',
            'leida_at'  => 'datetime',
        ];
    }

    public function scopeNoLeidas($q)
    {
        return $q->whereNull('leida_at');
    }

    public function marcarLeida(): void
    {
        if (! $this->leida_at) {
            $this->forceFill(['leida_at' => now()])->save();
        }
    }
}
