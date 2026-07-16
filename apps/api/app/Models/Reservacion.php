<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservacion extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'reservaciones';

    protected $fillable = [
        'local_id', 'mesa_id', 'cliente_nombre', 'cliente_telefono', 'fecha_hora', 'personas', 'estado', 'notas',
    ];

    protected function casts(): array
    {
        return ['fecha_hora' => 'datetime'];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }
}
