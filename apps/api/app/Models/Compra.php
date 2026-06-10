<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Compra extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $table = 'compras';

    protected $fillable = [
        'codigo', 'local_id', 'proveedor', 'referencia_factura', 'fecha',
        'subtotal', 'impuestos', 'total', 'notas', 'estado', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha'     => 'date',
            'subtotal'  => 'decimal:2',
            'impuestos' => 'decimal:2',
            'total'     => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $c) {
            if (! $c->codigo) {
                $c->codigo = 'CP-'.strtoupper(Str::random(6));
            }
        });
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleCompra::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
