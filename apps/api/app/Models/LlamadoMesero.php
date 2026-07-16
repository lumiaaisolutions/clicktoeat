<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LlamadoMesero extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'llamados_mesero';

    protected $fillable = ['local_id', 'mesa_id', 'atendido_at', 'atendido_por'];

    protected function casts(): array
    {
        return ['atendido_at' => 'datetime'];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }
}
