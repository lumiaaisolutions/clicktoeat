<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int    $id
 * @property int    $local_id
 * @property string $codigo
 * @property 'percent'|'fixed' $tipo
 * @property float  $valor
 * @property float  $min_subtotal
 * @property float|null $max_descuento
 * @property \Illuminate\Support\Carbon|null $fecha_desde
 * @property \Illuminate\Support\Carbon|null $fecha_hasta
 * @property int|null $max_usos
 * @property int    $usos_actuales
 * @property bool   $activo
 */
class Cupon extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $table = 'cupones';

    protected $fillable = [
        'local_id', 'codigo', 'tipo', 'valor',
        'min_subtotal', 'max_descuento',
        'fecha_desde', 'fecha_hasta',
        'max_usos', 'usos_actuales', 'activo',
        // F100 — cupones programados por horario
        'hora_inicio', 'hora_fin', 'dias_semana',
        'destacado_en_landing', 'productos_sugeridos',
    ];

    protected function casts(): array
    {
        return [
            'valor'         => 'decimal:2',
            'min_subtotal'  => 'decimal:2',
            'max_descuento' => 'decimal:2',
            'fecha_desde'   => 'date',
            'fecha_hasta'   => 'date',
            'activo'        => 'boolean',
            'dias_semana'   => 'array',
            'productos_sugeridos' => 'array',
            'destacado_en_landing' => 'boolean',
        ];
    }

    /** True si el cupón aplica AHORA según horario configurado. */
    public function aplicaEnEsteMomento(): bool
    {
        $now = now();
        // Días de semana
        if (! empty($this->dias_semana)) {
            $diaActual = strtolower($now->shortEnglishDayOfWeek); // 'mon', 'tue', ...
            if (! in_array($diaActual, $this->dias_semana, true)) return false;
        }
        // Horas
        if ($this->hora_inicio && $this->hora_fin) {
            $current = $now->format('H:i:s');
            if ($current < $this->hora_inicio || $current > $this->hora_fin) return false;
        }
        return true;
    }

    public function local(): BelongsTo
    {
        return $this->belongsTo(Local::class);
    }

    /** Scope: cupones vigentes hoy y activos. */
    public function scopeVigente(Builder $q): void
    {
        $hoy = now()->toDateString();
        $q->where('activo', true)
          ->where(fn ($qq) => $qq->whereNull('fecha_desde')->orWhere('fecha_desde', '<=', $hoy))
          ->where(fn ($qq) => $qq->whereNull('fecha_hasta')->orWhere('fecha_hasta', '>=', $hoy));
    }

    /** Scope: solo los destacados para mostrar en landing pública. */
    public function scopeDestacadosLanding(Builder $q): void
    {
        $q->vigente()->where('destacado_en_landing', true);
    }

    public function tieneCupoDisponible(): bool
    {
        return $this->max_usos === null || $this->usos_actuales < $this->max_usos;
    }

    /**
     * Calcula descuento sobre un subtotal. Aplica reglas:
     *  - subtotal >= min_subtotal
     *  - si es percent: subtotal * (valor/100), clamp a max_descuento
     *  - si es fixed: valor; clamp a subtotal (nunca descuenta más que el pedido)
     */
    public function calcularDescuento(float $subtotal): float
    {
        if ($subtotal < (float) $this->min_subtotal) return 0.0;

        $desc = $this->tipo === 'percent'
            ? round($subtotal * ((float) $this->valor) / 100, 2)
            : (float) $this->valor;

        if ($this->max_descuento !== null && $desc > (float) $this->max_descuento) {
            $desc = (float) $this->max_descuento;
        }
        return min($desc, $subtotal);
    }
}
