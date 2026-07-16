<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAttendance extends Model
{
    use BelongsToTenant, HasFactory;

    protected $table = 'staff_attendances';

    protected $fillable = ['local_id', 'user_id', 'entrada', 'salida', 'notas'];

    protected function casts(): array
    {
        return ['entrada' => 'datetime', 'salida' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
