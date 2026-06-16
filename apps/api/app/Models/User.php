<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $nombre
 * @property string $email
 * @property string $rol
 * @property array|null $permisos
 * @property int|null $local_id
 */
class User extends Authenticatable implements CanResetPassword
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public function getEmailForPasswordReset(): string
    {
        return $this->email;
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    protected $fillable = [
        'nombre', 'email', 'password', 'rol', 'local_id', 'permisos', 'notif_filtro',
        'two_factor_secret', 'two_factor_confirmed_at', 'two_factor_recovery_codes',
    ];

    protected $hidden = [
        'password', 'remember_token',
        'two_factor_secret', 'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'       => 'datetime',
            'password'                => 'hashed',
            'permisos'                => 'array',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! empty($this->two_factor_secret) && ! is_null($this->two_factor_confirmed_at);
    }

    /**
     * Módulos default si el staff fue creado sin permisos explícitos.
     */
    public const PERMISOS_DEFAULT_STAFF = ['pedidos'];

    /**
     * Lista exhaustiva de módulos a los que se puede dar permiso.
     * Ver docs/features/staff-permissions.md
     */
    public const MODULOS_VALIDOS = [
        'pedidos', 'pos', 'productos', 'categorias', 'inventario',
        'compras', 'recetas', 'metricas', 'branding', 'qr', 'horarios',
        'audit_log',
    ];

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class, 'local_id');
    }

    /** F71 — Lista completa de locales a los que tiene acceso. */
    public function locales(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(Local::class, 'user_locales', 'user_id', 'local_id')
            ->withPivot('created_at');
    }

    public function canAccessLocal(int $localId): bool
    {
        if ($this->isSuperAdmin()) return true;
        return $this->locales()->where('locales.id', $localId)->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->rol === 'super_admin';
    }

    public function isOwner(): bool
    {
        return $this->rol === 'owner';
    }

    public function isStaff(): bool
    {
        return $this->rol === 'staff';
    }

    /**
     * Lista efectiva de permisos: owner/super_admin tienen todos, staff los
     * que tenga listados (o el default si NULL).
     *
     * @return list<string>
     */
    public function permisosEfectivos(): array
    {
        if ($this->isOwner() || $this->isSuperAdmin()) {
            return self::MODULOS_VALIDOS;
        }

        $permisosAttr = $this->getAttributes()['permisos'] ?? null;
        if ($permisosAttr === null) {
            return self::PERMISOS_DEFAULT_STAFF;
        }
        $arr = is_string($permisosAttr) ? json_decode($permisosAttr, true) : $permisosAttr;
        return is_array($arr) ? array_values(array_intersect($arr, self::MODULOS_VALIDOS)) : self::PERMISOS_DEFAULT_STAFF;
    }

    /**
     * ¿Este usuario puede acceder al módulo dado?
     *
     * Casos:
     *  - owner / super_admin → TRUE siempre.
     *  - staff con permiso explícito → TRUE.
     *  - staff sin permiso → FALSE.
     */
    public function puedeAcceder(string $modulo): bool
    {
        return in_array($modulo, $this->permisosEfectivos(), true);
    }
}
