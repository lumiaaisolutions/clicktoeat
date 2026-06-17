<?php

namespace App\Support;

use App\Models\Local;

/**
 * Catálogo de feature keys del SaaS. Una clave string por capacidad del
 * sistema. Se persiste en `plans.features` (JSON) y se consulta vía
 * `Features::has($local, Features::INVENTARIO)`.
 *
 * Ver `docs/features/feature-gating.md` para qué módulo desbloquea cada
 * key y en qué plan está incluida.
 */
final class Features
{
    public const BRANDING_BASICO    = 'branding_basico';
    public const BRANDING_AVANZADO  = 'branding_avanzado';
    public const INVENTARIO         = 'inventario';
    public const RECETAS            = 'recetas';
    public const COMPRAS            = 'compras';
    public const METRICAS_BASICAS   = 'metricas_basicas';
    public const METRICAS_AVANZADAS = 'metricas_avanzadas';
    public const POS                = 'pos';
    public const QR_PERSONALIZADO   = 'qr_personalizado';
    public const NOTIFICACIONES     = 'notificaciones';
    public const STAFF_MULTI        = 'staff_multi';
    public const AUDIT_LOG          = 'audit_log';
    public const RESTORE            = 'restore';
    // F88 — exclusivas Premium
    public const MULTI_SUCURSAL     = 'multi_sucursal';
    public const WHITE_LABEL        = 'white_label';
    public const API_WEBHOOKS       = 'api_webhooks';   // deprecated — no se ofrece más
    public const SOPORTE_PREMIUM    = 'soporte_premium';

    // F100 — Nuevas features junio 2026
    public const REVIEWS            = 'reviews';
    public const CUPONES_PROGRAMADOS= 'cupones_programados';
    public const AUTO_PAUSE_STOCK   = 'auto_pause_stock';
    public const POS_OFFLINE        = 'pos_offline';
    public const CENTRO_APRENDIZAJE = 'centro_aprendizaje';

    /** @return list<string> */
    public static function all(): array
    {
        return array_values((new \ReflectionClass(self::class))->getConstants());
    }

    public static function has(Local $local, string $feature): bool
    {
        if (! $local->hasActivePlan()) {
            return false;
        }
        return in_array($feature, $local->plan?->features ?? [], true);
    }
}
