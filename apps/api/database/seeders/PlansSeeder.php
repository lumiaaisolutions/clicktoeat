<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Support\Features as F;
use Illuminate\Database\Seeder;

/**
 * Crea/actualiza los 2 planes del SaaS idempotentemente. Lee `stripe_price_id`
 * de `config/stripe.php` (que a su vez lee del `.env`). Si los Price IDs no
 * están configurados todavía, los deja en `null` — el seeder no falla y los
 * planes existen para desarrollo local sin Stripe.
 *
 * Re-ejecutable: actualiza campos existentes sin tocar los locales asociados.
 *
 * **Plan Esencial $99**: módulos básicos para arrancar a vender por WhatsApp
 * (venta/caja, pedidos, productos, horarios, qr, branding, categorías).
 * **Plan Profesional $299**: todos los módulos incluidos.
 *
 * Si existe un "premium" de versiones anteriores se DESACTIVA (no se borra)
 * para mantener integridad con locales que aún lo tengan asignado.
 *
 * Ver `docs/features/saas-billing.md#planes` para la matriz de features.
 */
class PlansSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            // Esencial — para arrancar a vender por WhatsApp.
            [
                'slug'                 => 'essential',
                'nombre'               => 'Esencial',
                'precio_mxn_centavos'  => 9900,
                'stripe_price_id'      => config('stripe.prices.essential'),
                'orden'                => 10,
                'max_productos'        => 30,
                'max_categorias'       => 8,
                'max_staff'            => 0,
                'features'             => [
                    F::BRANDING_BASICO,
                    F::BRANDING_AVANZADO,
                    F::QR_PERSONALIZADO,
                    F::POS,
                    F::NOTIFICACIONES,
                    F::REVIEWS,            // reviews públicas — desde Essential
                    F::CENTRO_APRENDIZAJE, // ayuda con animaciones — desde Essential
                ],
            ],
            // Profesional — todo incluido.
            [
                'slug'                 => 'professional',
                'nombre'               => 'Profesional',
                'precio_mxn_centavos'  => 29900,
                'stripe_price_id'      => config('stripe.prices.professional'),
                'orden'                => 20,
                'max_productos'        => null,
                'max_categorias'       => null,
                'max_staff'            => 10,
                'features'             => [
                    F::BRANDING_BASICO,
                    F::BRANDING_AVANZADO,
                    F::INVENTARIO,
                    F::RECETAS,
                    F::COMPRAS,
                    F::METRICAS_BASICAS,
                    F::METRICAS_AVANZADAS,
                    F::POS,
                    F::QR_PERSONALIZADO,
                    F::NOTIFICACIONES,
                    F::STAFF_MULTI,
                    F::AUDIT_LOG,
                    F::RESTORE,
                    F::REVIEWS,
                    F::CENTRO_APRENDIZAJE,
                    F::CUPONES_PROGRAMADOS,  // happy hour, 2x1 por horario
                    F::AUTO_PAUSE_STOCK,     // pausa producto si se agota ingrediente
                ],
            ],
            // F88 — Premium: para cadenas y locales que necesitan más control
            [
                'slug'                 => 'premium',
                'nombre'               => 'Premium',
                'precio_mxn_centavos'  => 49900,
                'stripe_price_id'      => config('stripe.prices.premium'),
                'orden'                => 30,
                'max_productos'        => null,
                'max_categorias'       => null,
                'max_staff'            => null,
                'features'             => [
                    F::BRANDING_BASICO,
                    F::BRANDING_AVANZADO,
                    F::INVENTARIO,
                    F::RECETAS,
                    F::COMPRAS,
                    F::METRICAS_BASICAS,
                    F::METRICAS_AVANZADAS,
                    F::POS,
                    F::QR_PERSONALIZADO,
                    F::NOTIFICACIONES,
                    F::STAFF_MULTI,
                    F::AUDIT_LOG,
                    F::RESTORE,
                    F::REVIEWS,
                    F::CENTRO_APRENDIZAJE,
                    F::CUPONES_PROGRAMADOS,
                    F::AUTO_PAUSE_STOCK,
                    F::MULTI_SUCURSAL,
                    F::WHITE_LABEL,
                    F::POS_OFFLINE,         // POS sigue cobrando sin internet
                    F::SOPORTE_PREMIUM,
                ],
            ],
        ];

        foreach ($plans as $data) {
            $existing = Plan::where('slug', $data['slug'])->first();

            // Preserva stripe_price_id existente si la env var está vacía.
            // Sin esto, re-correr el seeder sin las vars en .env borra el
            // price ID de planes que YA estaban cobrando en producción.
            if ($existing && empty($data['stripe_price_id']) && ! empty($existing->stripe_price_id)) {
                $data['stripe_price_id'] = $existing->stripe_price_id;
            }

            Plan::updateOrCreate(
                ['slug' => $data['slug']],
                $data + ['activo' => true],
            );
        }

        $this->command?->info('PlansSeeder: 3 planes activos (essential, professional, premium).');

        $missing = array_filter([
            'STRIPE_PRICE_ESSENTIAL'    => config('stripe.prices.essential'),
            'STRIPE_PRICE_PROFESSIONAL' => config('stripe.prices.professional'),
            'STRIPE_PRICE_PREMIUM'      => config('stripe.prices.premium'),
        ], fn ($v) => empty($v));

        if (! empty($missing)) {
            $this->command?->warn(
                'PlansSeeder: faltan en .env: '.implode(', ', array_keys($missing)).
                ' — los planes quedaron sin stripe_price_id (cobro no disponible).',
            );
        }
    }
}
