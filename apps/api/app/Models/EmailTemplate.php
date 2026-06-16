<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    protected $table = 'email_templates';
    protected $fillable = ['slug', 'subject', 'body_html', 'active'];
    protected $casts = ['active' => 'boolean'];

    public static function findBySlug(string $slug): ?self
    {
        return self::where('slug', $slug)->where('active', true)->first();
    }
}
