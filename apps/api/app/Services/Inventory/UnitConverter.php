<?php

namespace App\Services\Inventory;

use RuntimeException;

/**
 * Conversor de unidades para recetas granulares (F91).
 *
 * Convierte una cantidad de una unidad de origen a la unidad destino.
 * Sólo soporta pares dentro del mismo sistema:
 *   - masa:   g  ↔ kg
 *   - volumen: ml ↔ l
 *
 * Si las unidades son iguales, no convierte (passthrough).
 * Si son incompatibles (ej. g → l), lanza RuntimeException.
 */
class UnitConverter
{
    private const FACTORS = [
        // toBase (a la unidad base)
        'g'  => 1.0,        // base masa
        'kg' => 1000.0,
        'ml' => 1.0,        // base volumen
        'l'  => 1000.0,
    ];

    private const FAMILIAS = [
        'g' => 'masa', 'kg' => 'masa',
        'ml' => 'volumen', 'l' => 'volumen',
    ];

    public static function convertir(float $cantidad, ?string $desde, ?string $hasta): float
    {
        $desde = self::normalize($desde);
        $hasta = self::normalize($hasta);

        if (! $desde || ! $hasta || $desde === $hasta) {
            return $cantidad;
        }

        // Si alguno no está en factores (ej. 'unidad', 'pieza'), passthrough
        if (! isset(self::FACTORS[$desde]) || ! isset(self::FACTORS[$hasta])) {
            return $cantidad;
        }

        if (self::FAMILIAS[$desde] !== self::FAMILIAS[$hasta]) {
            throw new RuntimeException("No se puede convertir $desde → $hasta (unidades incompatibles).");
        }

        $base = $cantidad * self::FACTORS[$desde];
        return round($base / self::FACTORS[$hasta], 4);
    }

    private static function normalize(?string $u): ?string
    {
        if (! $u) return null;
        $u = strtolower(trim($u));
        return match ($u) {
            'gr', 'gramos', 'grams' => 'g',
            'kilogramo', 'kilogramos', 'kilo', 'kilos' => 'kg',
            'mililitros', 'mililitro' => 'ml',
            'litro', 'litros'         => 'l',
            default => $u,
        };
    }
}
