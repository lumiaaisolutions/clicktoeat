<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Mesa extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'mesas';

    protected $fillable = [
        'local_id', 'piso_id', 'etiqueta', 'pos_x', 'pos_y', 'estado', 'qr_token',
        'atendido_por', 'atendido_desde',
    ];

    protected $casts = [
        'atendido_desde' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (Mesa $mesa) {
            if (! $mesa->qr_token) {
                $mesa->qr_token = Str::random(24);
            }
        });
    }

    public function piso(): BelongsTo
    {
        return $this->belongsTo(Piso::class);
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    /** Mesero (o dueño) que tiene el control de la mesa. Null = sin atender. */
    public function mesero(): BelongsTo
    {
        return $this->belongsTo(User::class, 'atendido_por');
    }
}
