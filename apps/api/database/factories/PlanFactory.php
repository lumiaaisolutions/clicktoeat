<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Support\Features as F;
use Illuminate\Database\Eloquent\Factories\Factory;

class PlanFactory extends Factory
{
    protected $model = Plan::class;

    public function definition(): array
    {
        return [
            'slug' => 'plan-'.fake()->unique()->word(),
            'nombre' => fake()->word(),
            'precio_mxn_centavos' => 9900,
            'stripe_price_id' => 'price_test_'.fake()->lexify('??????????'),
            'features' => [F::BRANDING_BASICO],
            'max_productos' => null,
            'max_categorias' => null,
            'max_staff' => null,
            'activo' => true,
            'orden' => 10,
        ];
    }

    public function essential(): static
    {
        return $this->state(fn () => [
            'slug' => 'essential',
            'nombre' => 'Esencial',
            'precio_mxn_centavos' => 9900,
            'features' => [
                F::BRANDING_BASICO,
                F::BRANDING_AVANZADO,
                F::QR_PERSONALIZADO,
                F::POS,
                F::NOTIFICACIONES,
            ],
            'max_productos' => 30,
            'max_categorias' => 8,
            'max_staff' => 0,
            'orden' => 10,
        ]);
    }

    public function professional(): static
    {
        // Tras la migración a 2 planes (essential + professional), professional
        // incluye TODAS las features. Antes Premium tenía POS/audit_log/restore.
        return $this->state(fn () => [
            'slug' => 'professional',
            'nombre' => 'Profesional',
            'precio_mxn_centavos' => 29900,
            'features' => [
                F::BRANDING_BASICO, F::BRANDING_AVANZADO, F::INVENTARIO,
                F::RECETAS, F::COMPRAS, F::METRICAS_BASICAS, F::METRICAS_AVANZADAS,
                F::POS, F::QR_PERSONALIZADO, F::NOTIFICACIONES,
                F::STAFF_MULTI, F::AUDIT_LOG, F::RESTORE, F::CLICKY_ASSISTANT,
            ],
            'max_productos' => null,
            'max_categorias' => null,
            'max_staff' => null,
            'orden' => 20,
        ]);
    }

    /**
     * Premium real (cadenas / operación de salón). Incluye TODAS las features
     * de Profesional + las exclusivas de Premium (sucursales, salón, loyalty,
     * campañas, RRHH, directorio destacado). Refleja el `PlansSeeder`.
     */
    public function premium(): static
    {
        return $this->state(fn () => [
            'slug' => 'premium',
            'nombre' => 'Premium',
            'precio_mxn_centavos' => 49900,
            'features' => [
                F::BRANDING_BASICO, F::BRANDING_AVANZADO, F::INVENTARIO,
                F::RECETAS, F::COMPRAS, F::METRICAS_BASICAS, F::METRICAS_AVANZADAS,
                F::POS, F::QR_PERSONALIZADO, F::NOTIFICACIONES,
                F::STAFF_MULTI, F::AUDIT_LOG, F::RESTORE, F::CLICKY_ASSISTANT,
                F::MULTI_SUCURSAL, F::POS_OFFLINE, F::SOPORTE_PREMIUM,
                F::DINE_IN, F::CAJA_FISICA, F::TIP_POOLING, F::RESERVACIONES,
                F::LOYALTY_TIERS, F::GIFT_CARDS, F::CAMPANAS, F::RRHH_TURNOS,
                F::SUCURSALES_CONSOLIDADAS, F::DIRECTORIO_DESTACADO,
            ],
            'max_productos' => null,
            'max_categorias' => null,
            'max_staff' => null,
            'max_sucursales' => 5,
            'orden' => 30,
        ]);
    }
}
