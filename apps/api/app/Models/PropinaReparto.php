<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropinaReparto extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'propinas_reparto';

    protected $fillable = ['local_id', 'cuenta_mesa_id', 'user_id', 'rol', 'monto'];

    protected function casts(): array
    {
        return ['monto' => 'decimal:2'];
    }

    public function cuenta(): BelongsTo
    {
        return $this->belongsTo(CuentaMesa::class, 'cuenta_mesa_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
