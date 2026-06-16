<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $local_id
 * @property string $stripe_event_id
 * @property string $type
 * @property array $payload
 * @property \Illuminate\Support\Carbon|null $processed_at
 * @property string|null $error
 */
class SubscriptionEvent extends Model
{
    protected $fillable = [
        'local_id', 'stripe_event_id', 'type', 'payload', 'processed_at', 'error',
    ];

    protected function casts(): array
    {
        return [
            'payload'      => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class);
    }
}
