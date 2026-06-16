<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $nombre
 * @property string $slug
 * @property string $whatsapp
 * @property array|null $horarios
 * @property bool $activo
 */
class Local extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'locales';

    protected $fillable = [
        'nombre', 'slug', 'giro', 'tagline',
        'logo_url', 'banner_url',
        'color_primario', 'color_secundario', 'color_fondo', 'color_overrides',
        'tipografia', 'dark_mode',
        'lealtad_activo', 'lealtad_meta', 'lealtad_premio',
        'whatsapp', 'telefono', 'email_contacto',
        'direccion', 'lat', 'lng',
        'horarios', 'zona_entrega', 'zona_horaria',
        'delivery_fee', 'delivery_min_minutos', 'delivery_radio_km',
        'metodos_pago',
        'redes_sociales',
        'activo', 'suspendido', 'cerrado_temporal', 'modulos',
        'owner_id',
        // SaaS billing
        'plan_id', 'plan_status',
        'stripe_customer_id', 'stripe_subscription_id',
        'trial_ends_at', 'current_period_ends_at', 'canceled_at',
        'pago_externo', 'pago_externo_notas',
        // F31 — pagos anticipados al cliente final
        'acepta_pago_online', 'stripe_account_id',
        // F36 — referidos
        'codigo_referido',
    ];

    protected function casts(): array
    {
        return [
            'horarios'        => 'array',
            'zona_entrega'    => 'array',
            'redes_sociales'  => 'array',
            'metodos_pago'    => 'array',
            'color_overrides' => 'array',
            'lealtad_activo'  => 'boolean',
            'modulos'         => 'array',
            'dark_mode'        => 'boolean',
            'activo'           => 'boolean',
            'suspendido'       => 'boolean',
            'cerrado_temporal' => 'boolean',
            'delivery_fee'    => 'decimal:2',
            'lat'             => 'decimal:7',
            'lng'             => 'decimal:7',
            // SaaS billing
            'trial_ends_at'           => 'datetime',
            'current_period_ends_at'  => 'datetime',
            'canceled_at'             => 'datetime',
            'pago_externo'            => 'boolean',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function hasActivePlan(): bool
    {
        // Override manual del super admin — el local paga fuera de Stripe
        // (efectivo, transferencia, etc). Sigue gozando de plan activo.
        if ($this->pago_externo) {
            return true;
        }

        if (! $this->plan_id) {
            return false;
        }
        if (in_array($this->plan_status, ['trialing', 'active'], true)) {
            return true;
        }
        if ($this->plan_status === 'canceled' && $this->current_period_ends_at?->isFuture()) {
            return true;
        }
        if ($this->plan_status === 'past_due') {
            $graceDays = (int) config('stripe.grace_days_past_due', 3);
            $cutoff = $this->current_period_ends_at?->copy()->addDays($graceDays);
            return $cutoff?->isFuture() ?? false;
        }
        return false;
    }

    public function subscriptionEvents(): HasMany
    {
        return $this->hasMany(SubscriptionEvent::class);
    }

    public function onboardingTokens(): HasMany
    {
        return $this->hasMany(OnboardingToken::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(User::class, 'local_id');
    }

    public function categorias(): HasMany
    {
        return $this->hasMany(Categoria::class, 'local_id');
    }

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class, 'local_id');
    }

    public function ingredientes(): HasMany
    {
        return $this->hasMany(Ingrediente::class, 'local_id');
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'local_id');
    }

    public function scopeActivos(Builder $q): Builder
    {
        return $q->where('activo', true)->where('suspendido', false);
    }

    public function scopeBySlug(Builder $q, string $slug): Builder
    {
        return $q->where('slug', $slug);
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * F36 — Generar `codigo_referido` único al crear el local.
     *
     * Formato: primeros 6 chars del slug (uppercase, sin guiones) + '-' +
     * 4 chars random. Ej: 'STITCH-4F7K' para slug 'postres-stitch'.
     *
     * Si el slug tiene menos de 6 chars, se rellena con random. Si por
     * colisión astronómica falla el unique, se reintenta hasta 5 veces.
     */
    protected static function booted(): void
    {
        static::creating(function (self $local) {
            if (! empty($local->codigo_referido)) return;
            $base = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', $local->slug ?? ''));
            $base = str_pad(substr($base, 0, 6), 4, 'X');
            for ($i = 0; $i < 5; $i++) {
                $candidate = $base.'-'.strtoupper(\Illuminate\Support\Str::random(4));
                if (! self::query()->where('codigo_referido', $candidate)->exists()) {
                    $local->codigo_referido = $candidate;
                    return;
                }
            }
            // Improbable: fallback a 12 chars puro random
            $local->codigo_referido = 'REF-'.strtoupper(\Illuminate\Support\Str::random(8));
        });
    }
}
