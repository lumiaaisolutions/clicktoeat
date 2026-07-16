<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campana extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'campanas';

    protected $fillable = [
        'local_id', 'nombre', 'tipo', 'asunto', 'mensaje', 'segmento',
        'programada_para', 'enviada_at', 'destinatarios_count',
    ];

    protected function casts(): array
    {
        return ['programada_para' => 'datetime', 'enviada_at' => 'datetime'];
    }
}
