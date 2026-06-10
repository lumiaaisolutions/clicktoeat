<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetallePedido extends Model
{
    use HasFactory;

    protected $table = 'detalle_pedidos';

    protected $fillable = [
        'pedido_id', 'producto_id',
        'producto_nombre', 'precio_unitario', 'cantidad', 'subtotal',
        'extras_seleccionados', 'notas',
    ];

    protected function casts(): array
    {
        return [
            'precio_unitario'      => 'decimal:2',
            'subtotal'             => 'decimal:2',
            'cantidad'             => 'integer',
            'extras_seleccionados' => 'array',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
