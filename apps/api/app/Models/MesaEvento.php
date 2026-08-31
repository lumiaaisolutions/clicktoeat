<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Historial append-only de una mesa (Fase B, docs/features/salon-roadmap.md).
 * Se escribe desde MesaController y CuentaMesaService en cada cambio.
 */
class MesaEvento extends Model
{
    use BelongsToTenant;

    protected $table = 'mesa_eventos';

    protected $fillable = [
        'local_id', 'mesa_id', 'tipo', 'estado_anterior', 'estado_nuevo', 'user_id', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    /**
     * Registra un evento de mesa. Toma el user autenticado si lo hay (null en
     * el flujo público de QR). No lanza — el historial nunca debe tumbar la operación.
     *
     * @param  array{estado_anterior?:?string, estado_nuevo?:?string, meta?:?array}  $opts
     */
    public static function registrar(Mesa $mesa, string $tipo, array $opts = []): void
    {
        static::create([
            'local_id' => $mesa->local_id,
            'mesa_id' => $mesa->id,
            'tipo' => $tipo,
            'estado_anterior' => $opts['estado_anterior'] ?? null,
            'estado_nuevo' => $opts['estado_nuevo'] ?? null,
            'user_id' => Auth::id(),
            'meta' => $opts['meta'] ?? null,
        ]);
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
