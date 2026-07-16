<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CuentaMesa extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'cuentas_mesa';

    protected $fillable = [
        'local_id', 'mesa_id', 'estado', 'subtotal', 'propina_total', 'total', 'cerrada_at',
        'gift_card_id', 'descuento_gift_card',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'propina_total' => 'decimal:2',
            'total' => 'decimal:2',
            'descuento_gift_card' => 'decimal:2',
            'cerrada_at' => 'datetime',
        ];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    public function giftCard(): BelongsTo
    {
        return $this->belongsTo(GiftCard::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(PagoCuentaMesa::class);
    }
}
