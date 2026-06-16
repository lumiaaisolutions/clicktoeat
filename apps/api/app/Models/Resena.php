<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int    $id
 * @property int    $local_id
 * @property int    $producto_id
 * @property int|null $pedido_id
 * @property int    $calificacion 1..5
 * @property string|null $nombre_cliente
 * @property string|null $comentario
 * @property bool   $publicada
 */
class Resena extends Model
{
    use BelongsToTenant;

    protected $table = 'resenas';

    protected $fillable = [
        'local_id', 'producto_id', 'pedido_id',
        'calificacion', 'nombre_cliente', 'comentario', 'image_url', 'publicada',
    ];

    protected function casts(): array
    {
        return [
            'calificacion' => 'integer',
            'publicada'    => 'boolean',
        ];
    }

    public function producto(): BelongsTo { return $this->belongsTo(Producto::class); }
    public function pedido(): BelongsTo   { return $this->belongsTo(Pedido::class); }

    public function scopePublicadas(Builder $q): void { $q->where('publicada', true); }
}
