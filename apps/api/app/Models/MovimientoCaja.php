<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoCaja extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'movimientos_caja';

    protected $fillable = ['local_id', 'corte_caja_id', 'tipo', 'monto', 'motivo', 'user_id'];

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public function corte(): BelongsTo
    {
        return $this->belongsTo(CorteCaja::class, 'corte_caja_id');
    }
}
