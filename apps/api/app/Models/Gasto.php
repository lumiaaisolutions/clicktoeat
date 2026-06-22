<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Gasto operativo del local — luz, agua, gas, renta, nómina, etc.
 *
 * Distinto de `compras` (que es inventario de insumos para preparar pedidos).
 * Gastos son OPEX puro: lo que el local paga para operar (no para producir).
 *
 * @property int    $id
 * @property int    $local_id
 * @property string $categoria   Slug estable: luz|agua|gas|internet|...
 * @property string $concepto    Descripción libre tipo "CFE bimestral"
 * @property int    $monto_centavos
 * @property \Illuminate\Support\Carbon $fecha
 * @property bool   $recurrente
 * @property string|null $notas
 * @property string|null $comprobante_url
 * @property int|null $created_by_user_id
 */
class Gasto extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    public const CATEGORIAS = [
        'luz',
        'agua',
        'gas',
        'internet',
        'telefono',
        'renta',
        'nomina',
        'mantenimiento',
        'marketing',
        'impuestos',
        'seguros',
        'comisiones_bancarias',
        'otros',
    ];

    protected $fillable = [
        'local_id', 'categoria', 'concepto', 'monto_centavos',
        'fecha', 'recurrente', 'notas', 'comprobante_url',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha'       => 'date',
            'recurrente'  => 'boolean',
        ];
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    /** Helper para mostrar monto en MXN — uso solo en views/Resources. */
    public function getMontoMxnAttribute(): float
    {
        return round($this->monto_centavos / 100, 2);
    }
}
