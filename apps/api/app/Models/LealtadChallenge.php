<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LealtadChallenge extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'lealtad_challenges';

    protected $fillable = ['local_id', 'nombre', 'criterio', 'premio', 'activo'];

    protected function casts(): array
    {
        return ['criterio' => 'array', 'activo' => 'boolean'];
    }
}
