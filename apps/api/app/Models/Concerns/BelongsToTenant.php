<?php

namespace App\Models\Concerns;

use App\Models\Scopes\TenantScope;
use App\Models\Local;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Apply this trait to any model that has a local_id column.
 * Automatically scopes queries to the current tenant set in TenantContext.
 * Auto-fills local_id on create.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function ($model) {
            if (! $model->local_id) {
                $ctx = app(TenantContext::class);
                if ($ctx->has()) {
                    $model->local_id = $ctx->id();
                }
            }
        });
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'local_id');
    }

    public function scopeWithoutTenantScope($query)
    {
        return $query->withoutGlobalScope(TenantScope::class);
    }
}
