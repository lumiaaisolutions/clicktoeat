<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property ?int $local_id
 * @property ?int $actor_user_id
 * @property string $action
 * @property string $resource_type
 * @property int $resource_id
 * @property ?array $changes
 * @property ?string $ip
 * @property ?string $user_agent
 */
class AuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;   // sólo created_at, no updated_at

    protected $table = 'audit_logs';

    protected $fillable = [
        'local_id', 'actor_user_id',
        'action', 'resource_type', 'resource_id',
        'changes', 'ip', 'user_agent', 'created_at',
    ];

    protected function casts(): array
    {
        return [
            'changes'    => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'local_id');
    }
}
