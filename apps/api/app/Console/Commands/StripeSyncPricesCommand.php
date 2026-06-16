<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Services\Billing\StripeClientFactory;
use Illuminate\Console\Command;
use Throwable;

/**
 * Sincroniza los 3 planes locales con productos/precios en Stripe.
 *
 * Para cada plan en `plans` (essential/professional/premium):
 *  1. Si `stripe_price_id` ya está poblado, lo valida contra Stripe.
 *  2. Si no, busca producto por metadata `slug`. Crea uno nuevo si no existe.
 *  3. Crea un Price MXN recurring monthly con `precio_mxn_centavos`.
 *  4. Actualiza `plans.stripe_price_id` y opcionalmente escribe al `.env`.
 *
 * Uso:
 *   php artisan stripe:sync-prices              # solo sincroniza BD
 *   php artisan stripe:sync-prices --write-env  # además agrega/actualiza STRIPE_PRICE_* en .env
 *
 * Requiere `STRIPE_SECRET_KEY` ya configurado. Idempotente — re-ejecutable.
 */
class StripeSyncPricesCommand extends Command
{
    protected $signature = 'stripe:sync-prices {--write-env : Escribe los price IDs al .env}';
    protected $description = 'Sincroniza productos y precios de los planes en Stripe vía API.';

    public function __construct(
        private readonly StripeClientFactory $stripeFactory,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        if (empty(config('stripe.secret_key'))) {
            $this->error('STRIPE_SECRET_KEY no está configurado. Agrégalo a apps/api/.env primero.');
            return self::FAILURE;
        }

        try {
            $stripe = $this->stripeFactory->make();
        } catch (Throwable $e) {
            $this->error("No se pudo inicializar Stripe: {$e->getMessage()}");
            return self::FAILURE;
        }

        $plans = Plan::query()->where('activo', true)->orderBy('orden')->get();
        if ($plans->isEmpty()) {
            $this->warn('Sin planes activos. Corre `php artisan db:seed --class=PlansSeeder` primero.');
            return self::FAILURE;
        }

        $envEntries = [];

        foreach ($plans as $plan) {
            $this->line("→ {$plan->nombre} ({$plan->slug})  \${$plan->priceMxn()} MXN/mes");

            // Validar price existente si lo hay
            if (! empty($plan->stripe_price_id)) {
                try {
                    $price = $stripe->prices->retrieve($plan->stripe_price_id);
                    if ($price && $price->active) {
                        $this->info("  ✓ Price {$plan->stripe_price_id} ya existe y está activo.");
                        $envEntries["STRIPE_PRICE_".strtoupper($plan->slug)] = $plan->stripe_price_id;
                        continue;
                    }
                } catch (Throwable $e) {
                    $this->warn("  ⚠ Price {$plan->stripe_price_id} no se pudo validar: {$e->getMessage()} — recreando.");
                }
            }

            // Buscar producto por metadata
            $product = null;
            try {
                $search = $stripe->products->search([
                    'query' => "metadata['plan_slug']:'{$plan->slug}'",
                    'limit' => 1,
                ]);
                $product = $search->data[0] ?? null;
            } catch (Throwable $e) {
                $this->warn("  ⚠ Search falló: {$e->getMessage()} — creando producto nuevo.");
            }

            if (! $product) {
                $product = $stripe->products->create([
                    'name'        => "ClickToEat — {$plan->nombre}",
                    'description' => $this->descriptionFor($plan),
                    'metadata'    => ['plan_slug' => $plan->slug],
                ]);
                $this->info("  + Producto creado: {$product->id}");
            } else {
                $this->info("  ✓ Producto existente: {$product->id}");
            }

            $price = $stripe->prices->create([
                'product'     => $product->id,
                'currency'    => 'mxn',
                'unit_amount' => $plan->precio_mxn_centavos,
                'recurring'   => ['interval' => 'month'],
                'metadata'    => ['plan_slug' => $plan->slug],
            ]);
            $this->info("  + Price creado: {$price->id}");

            $plan->update(['stripe_price_id' => $price->id]);
            $envEntries["STRIPE_PRICE_".strtoupper($plan->slug)] = $price->id;
        }

        $this->newLine();
        $this->info("Sincronización completa.");

        if ($this->option('write-env')) {
            $this->writeEnv($envEntries);
        } else {
            $this->line('Agrega esto a apps/api/.env (o re-ejecuta con --write-env):');
            $this->newLine();
            foreach ($envEntries as $k => $v) {
                $this->line("  {$k}={$v}");
            }
        }

        return self::SUCCESS;
    }

    private function descriptionFor(Plan $plan): string
    {
        return match ($plan->slug) {
            'essential'    => 'Catálogo + landing pública + pedidos por WhatsApp. Para arrancar.',
            'professional' => 'Inventario, recetas, métricas, staff y más. Para operar tu local.',
            'premium'      => 'POS, historial de cambios, métricas avanzadas. Para escalar.',
            default        => $plan->nombre,
        };
    }

    /**
     * Actualiza/agrega entradas STRIPE_PRICE_* al .env preservando todo lo demás.
     */
    private function writeEnv(array $entries): void
    {
        $envPath = base_path('.env');
        if (! file_exists($envPath)) {
            $this->warn("No se encontró .env en {$envPath}. Saltando escritura.");
            return;
        }

        $contents = file_get_contents($envPath);
        $updated  = false;

        foreach ($entries as $key => $value) {
            $pattern = "/^{$key}=.*$/m";
            $line    = "{$key}={$value}";
            if (preg_match($pattern, $contents)) {
                $contents = preg_replace($pattern, $line, $contents);
            } else {
                $contents = rtrim($contents)."\n{$line}\n";
            }
            $updated = true;
        }

        if ($updated) {
            file_put_contents($envPath, $contents);
            $this->info(".env actualizado con ".count($entries)." entradas STRIPE_PRICE_*.");
            $this->warn('Recuerda correr `php artisan config:clear` para que el server recargue config.');
        }
    }
}
