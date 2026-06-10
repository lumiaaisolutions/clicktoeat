<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoInventario extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'movimientos_inventario';

    protected $fillable = [
        'local_id', 'ingrediente_id', 'tipo', 'cantidad',
        'stock_resultante', 'referencia', 'motivo', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'cantidad'         => 'decimal:3',
            'stock_resultante' => 'decimal:3',
        ];
    }

    public function ingrediente(): BelongsTo
    {
        return $this->belongsTo(Ingrediente::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
