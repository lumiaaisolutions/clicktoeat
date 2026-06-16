<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    protected $table = 'support_tickets';

    protected $fillable = [
        'local_id', 'user_id', 'asunto', 'categoria', 'prioridad', 'estado', 'cerrado_at',
    ];

    protected function casts(): array
    {
        return [
            'cerrado_at' => 'datetime',
        ];
    }

    public function local():  BelongsTo { return $this->belongsTo(Local::class); }
    public function user():   BelongsTo { return $this->belongsTo(User::class); }
    public function messages(): HasMany { return $this->hasMany(SupportMessage::class, 'ticket_id'); }
}
