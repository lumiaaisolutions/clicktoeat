<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Review extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'local_id', 'pedido_id', 'cliente_nombre', 'cliente_telefono',
        'rating', 'comentario', 'aprobado', 'token',
    ];

    protected $casts = [
        'rating'   => 'integer',
        'aprobado' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Review $r) {
            if (! $r->token) $r->token = Str::random(40);
        });
    }

    public function local(): BelongsTo  { return $this->belongsTo(Local::class); }
    public function pedido(): BelongsTo { return $this->belongsTo(Pedido::class); }
}
