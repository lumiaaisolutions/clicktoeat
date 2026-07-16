<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagoCuentaMesa extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'pagos_cuenta_mesa';

    protected $fillable = [
        'local_id', 'cuenta_mesa_id', 'corte_caja_id', 'monto', 'metodo_pago', 'pagado_por', 'stripe_payment_intent_id',
    ];

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public function cuenta(): BelongsTo
    {
        return $this->belongsTo(CuentaMesa::class, 'cuenta_mesa_id');
    }
}
