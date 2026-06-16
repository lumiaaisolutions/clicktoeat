<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Pedido extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $table = 'pedidos';

    protected $fillable = [
        'codigo', 'local_id',
        'cliente_nombre', 'cliente_email', 'cliente_telefono', 'lealtad_premio_listo', 'direccion', 'notas',
        'metodo_entrega', 'metodo_pago',
        'subtotal', 'delivery_fee', 'descuento', 'total',
        'estado', 'whatsapp_url',
        'confirmado_at', 'entregado_at',
        // F25 — cupón aplicado
        'cupon_codigo',
        // F27 — pedido programado (recoger a las X)
        'programado_para',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'        => 'decimal:2',
            'delivery_fee'    => 'decimal:2',
            'descuento'       => 'decimal:2',
            'total'           => 'decimal:2',
            'confirmado_at'   => 'datetime',
            'entregado_at'    => 'datetime',
            'programado_para' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Pedido $pedido) {
            if (! $pedido->codigo) {
                $pedido->codigo = 'CE-'.strtoupper(Str::random(6));
            }
        });
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }
}
