<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LealtadTier extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'lealtad_tiers';

    protected $fillable = ['local_id', 'nombre', 'sellos_requeridos', 'beneficio'];
}
