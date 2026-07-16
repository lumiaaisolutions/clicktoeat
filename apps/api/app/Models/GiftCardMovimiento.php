<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GiftCardMovimiento extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'gift_card_movimientos';

    protected $fillable = ['local_id', 'gift_card_id', 'tipo', 'monto', 'pedido_id'];

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }
}
