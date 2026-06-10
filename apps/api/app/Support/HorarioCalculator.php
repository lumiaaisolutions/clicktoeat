<?php

namespace App\Support;

use App\Models\Local;
use Carbon\Carbon;

/**
 * Decide si un local está abierto ahora, y calcula el siguiente cambio
 * (próxima apertura si está cerrado, próximo cierre si está abierto).
 *
 * Reglas:
 *  - Si `cerrado_temporal` está activo → cerrado, sin importar horario.
 *  - Si no hay horarios definidos → "sin horario" (estado null).
 *  - Horarios cruzando medianoche (close < open) se manejan correctamente.
 *  - Usa la zona horaria del local (default America/Mexico_City).
 */
class HorarioCalculator
{
    private const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
    private const NOMBRES = [
        'lun' => 'lunes', 'mar' => 'martes', 'mie' => 'miércoles',
        'jue' => 'jueves', 'vie' => 'viernes', 'sab' => 'sábado', 'dom' => 'domingo',
    ];

    /**
     * @return array{abierto: ?bool, mensaje: string, proxima_apertura: ?string, proximo_cierre: ?string}
     */
    public static function estado(Local $local): array
    {
        if ($local->cerrado_temporal) {
            return [
                'abierto'          => false,
                'mensaje'          => 'Cerrado temporalmente',
                'proxima_apertura' => null,
                'proximo_cierre'   => null,
            ];
        }

        $horarios = $local->horarios ?? [];
        if (empty($horarios)) {
            return [
                'abierto'          => null,
                'mensaje'          => 'Sin horario definido',
                'proxima_apertura' => null,
                'proximo_cierre'   => null,
            ];
        }

        $tz   = $local->zona_horaria ?: 'America/Mexico_City';
        $now  = Carbon::now($tz);
        $hoy  = self::DIAS[(int) $now->dayOfWeek];

        // Indexar horarios por día
        $byDia = [];
        foreach ($horarios as $h) {
            $byDia[$h['dia']] = $h;
        }

        // 1. ¿Está abierto ahora?
        // Considerar el día actual Y el día anterior (por horarios cruzando medianoche)
        $estadoHoy = self::checarDia($byDia[$hoy] ?? null, $now);
        if ($estadoHoy['abierto']) {
            return [
                'abierto'          => true,
                'mensaje'          => "Abierto · cierra a las {$estadoHoy['close']}",
                'proxima_apertura' => null,
                'proximo_cierre'   => $estadoHoy['close'],
            ];
        }

        $ayer = self::DIAS[(int) $now->copy()->subDay()->dayOfWeek];
        $estadoAyer = self::checarDia($byDia[$ayer] ?? null, $now, esContinuacion: true);
        if ($estadoAyer['abierto']) {
            return [
                'abierto'          => true,
                'mensaje'          => "Abierto · cierra a las {$estadoAyer['close']}",
                'proxima_apertura' => null,
                'proximo_cierre'   => $estadoAyer['close'],
            ];
        }

        // 2. Cerrado — encontrar próxima apertura
        $prox = self::proximaApertura($byDia, $now);

        return [
            'abierto'          => false,
            'mensaje'          => $prox ? "Cerrado · abre {$prox['cuando']}" : 'Cerrado',
            'proxima_apertura' => $prox['hora'] ?? null,
            'proximo_cierre'   => null,
        ];
    }

    /** Verifica si un día particular está abierto en `$now`. */
    private static function checarDia(?array $slot, Carbon $now, bool $esContinuacion = false): array
    {
        if (! $slot) return ['abierto' => false];

        [$oh, $om] = self::parse($slot['open'])  ?? [null, null];
        [$ch, $cm] = self::parse($slot['close']) ?? [null, null];
        if ($oh === null || $ch === null) return ['abierto' => false];

        $openMin  = $oh * 60 + $om;
        $closeMin = $ch * 60 + $cm;
        $nowMin   = $now->hour * 60 + $now->minute;

        // Caso 1: cierre antes que apertura → cruza medianoche
        if ($closeMin < $openMin) {
            // Si es continuación (chequear día anterior), solo importa el rango [0, closeMin)
            if ($esContinuacion) {
                $abierto = $nowMin < $closeMin;
            } else {
                // Día actual: abierto desde openMin hasta medianoche
                $abierto = $nowMin >= $openMin;
            }
        } else {
            if ($esContinuacion) return ['abierto' => false]; // no aplica
            $abierto = $nowMin >= $openMin && $nowMin < $closeMin;
        }

        return [
            'abierto' => $abierto,
            'close'   => $slot['close'],
            'open'    => $slot['open'],
        ];
    }

    /** Busca el próximo slot que abre, dentro de los próximos 7 días. */
    private static function proximaApertura(array $byDia, Carbon $now): ?array
    {
        for ($i = 0; $i < 7; $i++) {
            $futuro = $now->copy()->addDays($i);
            $dia    = self::DIAS[(int) $futuro->dayOfWeek];
            $slot   = $byDia[$dia] ?? null;
            if (! $slot) continue;

            [$oh, $om] = self::parse($slot['open']) ?? [null, null];
            if ($oh === null) continue;

            // En el día actual, solo si la apertura es en el futuro
            if ($i === 0) {
                $openMin = $oh * 60 + $om;
                $nowMin  = $now->hour * 60 + $now->minute;
                if ($openMin <= $nowMin) continue;
            }

            $label = $i === 0 ? 'hoy' : ($i === 1 ? 'mañana' : self::NOMBRES[$dia] ?? $dia);
            return [
                'cuando' => "{$label} a las {$slot['open']}",
                'hora'   => $slot['open'],
                'dia'    => $dia,
            ];
        }
        return null;
    }

    /** Parse "HH:MM" → [int hours, int minutes]; null si inválido. */
    private static function parse(?string $hhmm): ?array
    {
        if (! $hhmm || ! preg_match('/^(\d{1,2}):(\d{2})$/', $hhmm, $m)) return null;
        return [(int) $m[1], (int) $m[2]];
    }
}
