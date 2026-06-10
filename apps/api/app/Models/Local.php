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
        'nombre', 'slug', 'tagline',
        'logo_url', 'banner_url',
        'color_primario', 'color_secundario', 'color_fondo',
        'tipografia', 'dark_mode',
        'whatsapp', 'telefono', 'email_contacto',
        'direccion', 'lat', 'lng',
        'horarios', 'zona_entrega', 'zona_horaria',
        'delivery_fee', 'delivery_min_minutos', 'delivery_radio_km',
        'metodos_pago',
        'redes_sociales',
        'activo', 'suspendido', 'cerrado_temporal', 'modulos',
        'owner_id',
    ];

    protected function casts(): array
    {
        return [
            'horarios'        => 'array',
            'zona_entrega'    => 'array',
            'redes_sociales'  => 'array',
            'metodos_pago'    => 'array',
            'modulos'         => 'array',
            'dark_mode'        => 'boolean',
            'activo'           => 'boolean',
            'suspendido'       => 'boolean',
            'cerrado_temporal' => 'boolean',
            'delivery_fee'    => 'decimal:2',
            'lat'             => 'decimal:7',
            'lng'             => 'decimal:7',
        ];
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
}
