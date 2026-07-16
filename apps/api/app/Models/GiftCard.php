<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GiftCard extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'gift_cards';

    protected $fillable = ['local_id', 'codigo', 'monto_inicial', 'saldo', 'comprador_email', 'estado'];

    protected function casts(): array
    {
        return ['monto_inicial' => 'decimal:2', 'saldo' => 'decimal:2'];
    }

    public function movimientos(): HasMany
    {
        return $this->hasMany(GiftCardMovimiento::class);
    }
}
