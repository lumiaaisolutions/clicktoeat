<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    public $timestamps = false;
    protected $table = 'support_messages';
    protected $fillable = ['ticket_id', 'user_id', 'mensaje', 'from_super', 'created_at'];
    protected $casts = ['from_super' => 'boolean', 'created_at' => 'datetime'];

    public function ticket(): BelongsTo { return $this->belongsTo(SupportTicket::class, 'ticket_id'); }
    public function user():   BelongsTo { return $this->belongsTo(User::class); }
}
