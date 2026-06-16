<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NewsletterBlast extends Model
{
    protected $table = 'newsletter_blasts';
    protected $fillable = [
        'user_id', 'asunto', 'body', 'recipients_count',
        'sent_count', 'failed_count', 'started_at', 'finished_at',
    ];
    protected $casts = [
        'started_at'  => 'datetime',
        'finished_at' => 'datetime',
    ];
}
