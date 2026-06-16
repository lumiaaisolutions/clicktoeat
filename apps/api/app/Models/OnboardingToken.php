<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $local_id
 * @property string $value
 * @property array|null $completed_steps
 * @property \Illuminate\Support\Carbon|null $used_at
 * @property \Illuminate\Support\Carbon $expires_at
 */
class OnboardingToken extends Model
{
    protected $fillable = [
        'local_id', 'value', 'completed_steps', 'used_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_steps' => 'array',
            'used_at'         => 'datetime',
            'expires_at'      => 'datetime',
        ];
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class);
    }

    public function isValid(): bool
    {
        return $this->used_at === null && $this->expires_at->isFuture();
    }

    public function markStepCompleted(string $step): void
    {
        $steps = $this->completed_steps ?? [];
        if (! in_array($step, $steps, true)) {
            $steps[] = $step;
            $this->completed_steps = $steps;
            $this->save();
        }
    }

    public static function issueFor(Local $local, ?int $ttlHours = null): self
    {
        $ttl = $ttlHours ?? config('stripe.onboarding_token_ttl_h', 24);
        return self::create([
            'local_id'   => $local->id,
            'value'      => Str::random(64),
            'expires_at' => now()->addHours($ttl),
        ]);
    }
}
