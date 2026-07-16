<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Agrupa varios `Local` de un mismo dueño para reportes consolidados.
 * NO es tenant-scoped por `local_id` (está por encima de esa unidad) — ver
 * ADR-014. El aislamiento de cada Local individual sigue intacto.
 */
class Organization extends Model
{
    use HasFactory;

    protected $table = 'organizations';

    protected $fillable = ['nombre', 'owner_user_id'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function locales(): HasMany
    {
        return $this->hasMany(Local::class, 'organization_id');
    }
}
