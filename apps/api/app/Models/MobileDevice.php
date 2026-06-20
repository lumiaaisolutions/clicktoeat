<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MobileDevice extends Model
{
    protected $fillable = [
        'user_id', 'local_id', 'expo_push_token', 'platform',
        'device_name', 'app_version', 'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class);
    }
}
