<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $referrer_local_id
 * @property int $referred_local_id
 * @property 'pending'|'rewarded'|'invalid' $status
 * @property \Illuminate\Support\Carbon|null $rewarded_at
 * @property string|null $stripe_coupon_id
 */
class Referral extends Model
{
    protected $fillable = [
        'referrer_local_id', 'referred_local_id',
        'status', 'rewarded_at', 'stripe_coupon_id',
    ];

    protected function casts(): array
    {
        return ['rewarded_at' => 'datetime'];
    }

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'referrer_local_id');
    }

    public function referred(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'referred_local_id');
    }
}
