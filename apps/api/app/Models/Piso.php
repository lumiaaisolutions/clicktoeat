<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Piso extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'pisos';

    protected $fillable = ['local_id', 'nombre', 'orden'];

    public function mesas(): HasMany
    {
        return $this->hasMany(Mesa::class);
    }
}
