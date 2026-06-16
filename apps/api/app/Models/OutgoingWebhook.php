<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutgoingWebhook extends Model
{
    protected $fillable = [
        'local_id', 'event', 'url', 'secret', 'active',
        'last_called_at', 'last_status', 'last_error', 'error_count',
    ];

    protected function casts(): array
    {
        return [
            'active'         => 'boolean',
            'last_called_at' => 'datetime',
            'last_status'    => 'integer',
            'error_count'    => 'integer',
        ];
    }
}
