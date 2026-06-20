<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // CRÍTICO: TenantContext debe ser singleton — el middleware lo settea
        // y el GlobalScope lo lee. Sin singleton, son instancias distintas y el
        // scope no filtra nada.
        $this->app->singleton(\App\Support\TenantContext::class);
    }

    public function boot(): void
    {
        Model::shouldBeStrict(! $this->app->isProduction());

        // SEV-6 — `Model::unguard()` global removido en 2026-06-20.
        // Cada modelo declara su propio `$fillable` (verificado por
        // FillableGuardTest). El allowlist explícito por modelo es la
        // red correcta contra mass assignment, no un toggle global que
        // depende de disciplina humana en cada PR nuevo.

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        $this->configureRateLimiting();
        $this->registerAuditObservers();
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip());
        });

        // Rate limit por TENANT en endpoints públicos críticos.
        // Resuelve {slug} del path para keyar por local en lugar de IP — evita
        // que un atacante con muchas IPs sature a un local específico.
        // Ver: docs/security/threat-model.md vector #9.
        RateLimiter::for('public-orders-by-tenant', function (Request $request) {
            $slug = $request->route('slug') ?? 'unknown';
            return [
                // 100 pedidos/min por local — generoso para horarios pico legítimos
                Limit::perMinute(100)->by("local:{$slug}"),
                // Fallback por IP — 20/min (mismo que el throttle de ruta original)
                Limit::perMinute(20)->by($request->ip()),
            ];
        });
    }

    /**
     * Conecta AuditObserver a los modelos sensibles.
     * Cualquier created/updated/deleted en estos modelos queda registrado en `audit_logs`.
     */
    protected function registerAuditObservers(): void
    {
        $audited = [
            \App\Models\Local::class,
            \App\Models\User::class,
            \App\Models\Categoria::class,
            \App\Models\Producto::class,
            \App\Models\Ingrediente::class,
            \App\Models\Pedido::class,
            \App\Models\Compra::class,
        ];

        foreach ($audited as $modelClass) {
            $modelClass::observe(\App\Observers\AuditObserver::class);
        }
    }
}
