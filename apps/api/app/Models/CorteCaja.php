<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CorteCaja extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'cortes_caja';

    protected $fillable = [
        'local_id', 'caja_id', 'abierto_por', 'cerrado_por',
        'monto_inicial', 'monto_esperado', 'monto_contado', 'varianza',
        'abierta_at', 'cerrada_at',
    ];

    protected function casts(): array
    {
        return [
            'monto_inicial' => 'decimal:2',
            'monto_esperado' => 'decimal:2',
            'monto_contado' => 'decimal:2',
            'varianza' => 'decimal:2',
            'abierta_at' => 'datetime',
            'cerrada_at' => 'datetime',
        ];
    }

    public function caja(): BelongsTo
    {
        return $this->belongsTo(Caja::class);
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(MovimientoCaja::class);
    }
}
