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
}
