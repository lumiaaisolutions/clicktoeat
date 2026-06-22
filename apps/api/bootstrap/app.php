<?php

use App\Http\Middleware\EnforceTenantScope;
use App\Http\Middleware\EnsureSuperAdmin;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\DB;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API token-only (Sanctum personal access tokens).
        // NO usamos el modo "SPA stateful" porque Next.js corre en otro origen
        // (localhost:3000) y eso forzaría CSRF + cookies. Bearer token puro.
        //
        // SEV-2 — CookieToBearer es el primer paso de la migración a cookie
        // HttpOnly (ADR-010). Lee la cookie `cte_token` y la convierte en
        // header Authorization Bearer ANTES de auth:sanctum. Aditivo, no
        // rompe el flujo actual (bearer header explícito sigue teniendo
        // prioridad).
        //
        // EncryptCookies es REQUERIDO antes de CookieToBearer porque el
        // login emite la cookie encriptada por convención Laravel. Sin
        // este middleware, en prod la cookie se enviaría al cliente como
        // base64 del token plano (leak en cualquier interceptor de cookies
        // del navegador con extensiones). EncryptCookies → en respuesta
        // encripta antes de enviar; en request decripta antes de leer.
        $middleware->use([
            \Illuminate\Http\Middleware\HandleCors::class,
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \App\Http\Middleware\CookieToBearer::class,
        ]);

        $middleware->alias([
            'tenant'      => EnforceTenantScope::class,
            'super_admin' => EnsureSuperAdmin::class,
            'idempotent'  => \App\Http\Middleware\Idempotency::class,
            'feature'     => \App\Http\Middleware\RequiresFeature::class,
        ]);

        $middleware->throttleApi();
    })
    ->withSchedule(function (Schedule $schedule) {
        // ─── Limpieza diaria de tablas que crecen sin control ──────────
        // Cron en hPanel: * * * * * cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html && php artisan schedule:run >> /dev/null 2>&1
        // Laravel decide internamente qué tareas correr según la hora.

        // Idempotency keys expiradas (TTL del request, default 24h)
        $schedule->call(function () {
            DB::table('idempotency_keys')->where('expires_at', '<', now())->delete();
        })->daily()->at('02:00')->name('prune-idempotency-keys')->onOneServer();

        // Sessions inactivas > 30 días (driver session=database)
        $schedule->call(function () {
            DB::table('sessions')
                ->where('last_activity', '<', now()->subDays(30)->timestamp)
                ->delete();
        })->daily()->at('02:10')->name('prune-sessions')->onOneServer();

        // Cache expirada (driver cache=database)
        $schedule->call(function () {
            DB::table('cache')->where('expiration', '<', now()->timestamp)->delete();
            DB::table('cache_locks')->where('expiration', '<', now()->timestamp)->delete();
        })->daily()->at('02:15')->name('prune-cache')->onOneServer();

        // Sanctum tokens expirados — el comando solo borra los que tienen expires_at < now()
        // (hoy queda NULL, por lo que no borra nada; útil cuando se introduzca rotación)
        $schedule->command('sanctum:prune-expired --hours=24')
            ->daily()->at('02:20')->name('prune-sanctum')->onOneServer();

        // Failed jobs viejos
        $schedule->command('queue:prune-failed --hours=2160')   // 90 días
            ->daily()->at('02:25')->name('prune-failed-jobs')->onOneServer();

        // ─── Limpieza semanal de audit_logs > 90 días ───────────────────
        // 90 días es el SLA documentado en docs/security/data-inventory.md
        $schedule->call(function () {
            DB::table('audit_logs')->where('created_at', '<', now()->subDays(90))->delete();
        })->weekly()->sundays()->at('03:00')->name('prune-audit-logs')->onOneServer();

        // ─── Limpieza semanal de notificaciones leídas viejas ──────────
        $schedule->call(function () {
            DB::table('notificaciones')
                ->whereNotNull('leida_at')
                ->where('leida_at', '<', now()->subDays(90))
                ->delete();
        })->weekly()->sundays()->at('03:10')->name('prune-notifications')->onOneServer();

        // ─── Onboarding emails durante el trial (F64) ──────────────────
        // Día 3 / 7 / 14 desde el alta del local + 1 día antes de fin de trial.
        // Idempotente vía tabla local_email_log (unique local_id + tipo).
        $schedule->call(function () {
            \App\Services\Notifications\TrialNudgeDispatcher::dispatchPending();
        })->daily()->at('10:00')->name('trial-nudge-emails')->onOneServer();

        // ─── F100g: Expira trials MANUALES vencidos ─────────────────────
        // Trials creados via Stripe se expiran solos por webhook. Los
        // marcados a mano por super_admin no — este cron los cierra el día
        // que vencen para que PlanInactiveScreen los bloquee.
        $schedule->command('trials:expire-manual')
            ->daily()->at('10:30')->name('expire-manual-trials')->onOneServer();

        // ─── Carrito abandonado (F75) — cada 15 min ────────────────────
        $schedule->call(function () {
            \App\Services\Notifications\CarritoAbandonadoDispatcher::dispatchPending();
        })->everyFifteenMinutes()->name('carrito-abandonado')->onOneServer();

        // ─── Resumen semanal a owners (F74) — domingos 20:00 ───────────
        $schedule->call(function () {
            \App\Services\Notifications\ResumenSemanalDispatcher::dispatchAll();
        })->weekly()->sundays()->at('20:00')->name('resumen-semanal')->onOneServer();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Reporta excepciones a Sentry si DSN está configurado.
        // No bloquea si la lib no está cargada — fallback silencioso.
        \Sentry\Laravel\Integration::handles($exceptions);

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'No autenticado'], 401);
            }
        });

        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors'  => $e->errors(),
                ], 422);
            }
        });

        // SaaS — límite cuantitativo de plan alcanzado (max_productos, etc.)
        $exceptions->render(function (\App\Exceptions\PlanLimitException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message'     => $e->getMessage(),
                    'code'        => 'PLAN_LIMIT',
                    'feature'     => $e->feature,
                    'limit'       => $e->limit,
                    'current'     => $e->current,
                    'upgrade_url' => '/admin/billing',
                ], 402);
            }
        });
    })->create();
