<?php

use App\Http\Controllers\Api\Admin\LocalController as AdminLocalController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\HorarioController;
use App\Http\Controllers\Api\MetricasController;
use App\Http\Controllers\Api\IngredienteController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\LocalController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\Public\MenuController;
use App\Http\Controllers\Api\Public\PedidoController as PublicPedidoController;
use App\Http\Controllers\Api\RecetaController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Auto-prefixed with /api/v1 by bootstrap/app.php.
*/

// Health endpoint deep — fuera del throttle pero con rate limit propio.
// Útil para uptimerobot/pingdom. /up sigue siendo el liveness simple.
Route::get('health/deep', [\App\Http\Controllers\Api\HealthController::class, 'deep'])
    ->middleware('throttle:30,1');

Route::middleware('throttle:60,1')->group(function () {

    // ─── Public ───────────────────────────────────────────────────────
    Route::prefix('public')->group(function () {

        // Derecho de borrado (LFPDPPP / GDPR). 3 solicitudes / hora por IP.
        Route::post('borrar-mis-datos', [\App\Http\Controllers\Api\Public\DataDeletionController::class, 'request'])
            ->middleware('throttle:3,60');

        // Estado de sellos de lealtad por email
        Route::post('lealtad/{slug}/status', [\App\Http\Controllers\Api\Public\LoyaltyController::class, 'status'])
            ->middleware('throttle:30,1');

        // Tracking de carrito abandonado (F75)
        Route::post('carrito-abandonado/{slug}', [\App\Http\Controllers\Api\Public\CarritoAbandonadoController::class, 'track'])
            ->middleware('throttle:30,1');

        Route::get('menu/{slug}',     [MenuController::class, 'show'])->name('public.menu.show');
        Route::get('locales',         [MenuController::class, 'index'])->name('public.locales.index');
        // Rate limit por tenant (100/min por local) + IP fallback (20/min) + idempotency.
        // Ver: AppServiceProvider::configureRateLimiting + docs/api/rate-limits.md
        Route::post('pedidos/{slug}', [PublicPedidoController::class, 'store'])
            ->middleware(['throttle:public-orders-by-tenant', 'idempotent:24h'])
            ->name('public.pedidos.store');

        // Validación pública de cupón antes del checkout.
        Route::post('cupones/{slug}/validar',
            [\App\Http\Controllers\Api\Public\CuponController::class, 'validar'])
            ->middleware('throttle:30,1');
        // F100 — Cupones destacados activos AHORA para banner en landing
        Route::get('cupones/{slug}/destacados',
            [\App\Http\Controllers\Api\Public\CuponController::class, 'destacados']);

        // Reseñas públicas POR PRODUCTO — el cliente reseña un producto específico
        Route::post('resenas/{pedidoCodigo}',
            [\App\Http\Controllers\Api\Public\ResenaController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('resenas/{slug}/{producto_id}',
            [\App\Http\Controllers\Api\Public\ResenaController::class, 'porProducto']);

        // F100 — Calificación GENERAL del local (rating + comentario por token)
        Route::get('reviews/local/{slug}',          [\App\Http\Controllers\Api\ReviewController::class, 'indexForLocal']);
        Route::get('reviews/token/{token}',         [\App\Http\Controllers\Api\ReviewController::class, 'showByToken']);
        Route::post('reviews/token/{token}',        [\App\Http\Controllers\Api\ReviewController::class, 'submitByToken'])
            ->middleware('throttle:5,1');
    });

    // ─── Billing (SaaS) ───────────────────────────────────────────────
    Route::prefix('billing')->group(function () {
        Route::get('plans',                  [\App\Http\Controllers\Api\BillingController::class, 'plans']);
        Route::post('checkout',              [\App\Http\Controllers\Api\BillingController::class, 'checkout'])
            ->middleware('throttle:10,1');
        Route::get('session/{sessionId}',    [\App\Http\Controllers\Api\BillingController::class, 'session'])
            ->middleware('throttle:30,1');
    });

    // ─── Onboarding (post-checkout, requiere onboarding_token) ────────
    Route::prefix('onboarding')->middleware('throttle:30,1')->group(function () {
        Route::post('password',  [\App\Http\Controllers\Api\OnboardingController::class, 'password']);
        Route::post('local',     [\App\Http\Controllers\Api\OnboardingController::class, 'local']);
        Route::post('branding',  [\App\Http\Controllers\Api\OnboardingController::class, 'branding']);
        Route::post('contacto',  [\App\Http\Controllers\Api\OnboardingController::class, 'contacto']);
        Route::post('finalizar', [\App\Http\Controllers\Api\OnboardingController::class, 'finalizar']);
        Route::post('upload',    [\App\Http\Controllers\Api\OnboardingController::class, 'uploadImagen']);
    });

    // ─── Webhooks de Stripe (sin auth, verificados por firma) ─────────
    Route::post('webhooks/stripe', [\App\Http\Controllers\Api\WebhookController::class, 'stripe'])
        ->name('webhooks.stripe');

    // Backwards-friendly alias
    Route::get('menu/{slug}', [MenuController::class, 'show']);

    // ─── Auth ─────────────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        // Route-level: 30/min/IP (red ancha); el rate limiter manual del controller filtra por email (5/min).
        Route::post('login',    [AuthController::class, 'login'])->middleware('throttle:30,1');

        // F89 — self-service signup (user sin local todavía)
        Route::post('signup-prospect', [\App\Http\Controllers\Api\SignupController::class, 'prospect'])
            ->middleware('throttle:5,1');

        // Reset de contraseña por email
        Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:5,1');
        Route::post('reset-password',  [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me',                [AuthController::class, 'me']);
            Route::post('logout',           [AuthController::class, 'logout']);
            Route::patch('me/password',     [PasswordController::class, 'updateOwn'])
                ->middleware('throttle:5,1');

            // 2FA TOTP (F67)
            Route::get('2fa/status',  [\App\Http\Controllers\Api\TwoFactorController::class, 'status']);
            Route::post('2fa/setup',   [\App\Http\Controllers\Api\TwoFactorController::class, 'setup'])->middleware('throttle:10,1');
            Route::post('2fa/confirm', [\App\Http\Controllers\Api\TwoFactorController::class, 'confirm'])->middleware('throttle:10,1');
            Route::post('2fa/disable', [\App\Http\Controllers\Api\TwoFactorController::class, 'disable'])->middleware('throttle:10,1');
        });
    });

    // ─── Authenticated (tenant-scoped) ────────────────────────────────
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {

        Route::get('dashboard', function () {
            $user = request()->user();
            return response()->json([
                'mensaje'  => "Hola, {$user->nombre}",
                'rol'      => $user->rol,
                'local_id' => $user->local_id,
            ]);
        });

        // F71 — Multi-sucursal
        Route::get('me/locales',                [\App\Http\Controllers\Api\UserLocalesController::class, 'myLocales']);
        Route::post('me/switch-local/{localId}',[\App\Http\Controllers\Api\UserLocalesController::class, 'switchLocal']);

        // F84 — filtro de notificación del propio user (movido aquí del grupo auth/ porque el frontend lo llama sin prefijo)
        Route::get('me/notif-filtro', function (\Illuminate\Http\Request $r) {
            return response()->json(['data' => ['notif_filtro' => $r->user()->notif_filtro ?? 'todos']]);
        });
        Route::patch('me/notif-filtro', function (\Illuminate\Http\Request $r) {
            $r->validate(['notif_filtro' => ['required', 'in:todos,cocina,caja,delivery,ninguno']]);
            $u = $r->user(); $u->notif_filtro = $r->input('notif_filtro'); $u->save();
            return response()->json(['data' => ['notif_filtro' => $u->notif_filtro]]);
        });

        // Banner global de anuncios del super (visible para todos)
        Route::get('anuncios/activos', function (\Illuminate\Http\Request $r) {
            $u = $r->user();
            $items = \App\Models\AnuncioGlobal::query()
                ->where('active', true)
                ->where(function ($q) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
                })
                ->when($u->rol === 'super_admin', fn ($q) => $q->where('show_to_super', true))
                ->orderByDesc('id')
                ->get(['id', 'titulo', 'body', 'severity']);
            return response()->json(['data' => $items]);
        });

        // F92 — Tickets de soporte (owner-side)
        Route::get('soporte/tickets',  [\App\Http\Controllers\Api\Admin\TicketsController::class, 'listForOwner']);
        Route::post('soporte/tickets', [\App\Http\Controllers\Api\Admin\TicketsController::class, 'storeForOwner']);
        Route::post('soporte/tickets/{ticket}/reply', [\App\Http\Controllers\Api\Admin\TicketsController::class, 'replyAsOwner']);

        // F85 — búsqueda global Cmd+K
        Route::get('search', [\App\Http\Controllers\Api\SearchController::class, 'search'])
            ->middleware('throttle:60,1');

        // Local (mío) — branding y configuración
        Route::get('local',    [LocalController::class, 'show']);
        Route::patch('local',  [LocalController::class, 'update']);

        // Cancellation feedback (F76)
        Route::post('billing/cancel-feedback', [\App\Http\Controllers\Api\CancellationFeedbackController::class, 'store'])
            ->middleware('throttle:5,1');

        // F90 — Webhooks outgoing (sólo Premium via feature gate)
        Route::middleware('feature:api_webhooks')->group(function () {
            Route::get('webhooks',                  [\App\Http\Controllers\Api\OutgoingWebhookController::class, 'index']);
            Route::post('webhooks',                 [\App\Http\Controllers\Api\OutgoingWebhookController::class, 'store']);
            Route::patch('webhooks/{webhook}',      [\App\Http\Controllers\Api\OutgoingWebhookController::class, 'update']);
            Route::delete('webhooks/{webhook}',     [\App\Http\Controllers\Api\OutgoingWebhookController::class, 'destroy']);
        });

        // Web Push — VAPID + suscripciones del browser
        Route::get('push/vapid-public-key',  [\App\Http\Controllers\Api\PushSubscriptionController::class, 'publicKey']);
        Route::post('push/subscribe',        [\App\Http\Controllers\Api\PushSubscriptionController::class, 'subscribe'])
            ->middleware('throttle:20,1');
        Route::post('push/unsubscribe',      [\App\Http\Controllers\Api\PushSubscriptionController::class, 'unsubscribe'])
            ->middleware('throttle:20,1');

        // Horarios (gestión dedicada)
        Route::get('local/horarios',   [HorarioController::class, 'show']);
        Route::patch('local/horarios', [HorarioController::class, 'update']);

        // Staff del local (gestión del equipo — sólo owner)
        Route::get('local/staff',                [StaffController::class, 'index']);
        Route::post('local/staff',               [StaffController::class, 'store']);
        Route::get('local/staff/{staff}',         [StaffController::class, 'show']);
        Route::patch('local/staff/{staff}',       [StaffController::class, 'update']);
        Route::delete('local/staff/{staff}',      [StaffController::class, 'destroy']);

        // Métricas / reportes — gated por plan
        Route::middleware('feature:metricas_basicas')->group(function () {
            Route::get('metricas',         [MetricasController::class, 'index']);
        });

        // Audit log del local (sólo owner) — gated por plan (Premium)
        Route::get('audit-logs',       [AuditLogController::class, 'index'])
            ->middleware('feature:audit_log');

        // Billing — Customer Portal de Stripe (cambiar plan, cancelar, facturas)
        Route::get('billing/portal', [\App\Http\Controllers\Api\BillingController::class, 'portal']);
        // F100g — Activa local existente (sin stripe_customer) vinculando una
        // nueva subscription al local actual vía client_reference_id.
        Route::post('billing/activate-existing', [\App\Http\Controllers\Api\BillingController::class, 'activateExisting']);

        // Cupones / descuentos
        Route::apiResource('cupones', \App\Http\Controllers\Api\CuponController::class);
        Route::post('cupones/{cupon}/toggle', [\App\Http\Controllers\Api\CuponController::class, 'toggle']);

        // F100 — Reviews/calificaciones del local (moderación owner)
        Route::get('admin/reviews', [\App\Http\Controllers\Api\ReviewController::class, 'indexAdmin']);
        Route::patch('admin/reviews/{review}/toggle', [\App\Http\Controllers\Api\ReviewController::class, 'toggleAprobado']);
        Route::delete('admin/reviews/{review}', [\App\Http\Controllers\Api\ReviewController::class, 'destroyAdmin']);
        // Genera (o recupera) el token de review de un pedido. Permite que el
        // owner copie el link aunque el pedido entregado sea legacy (sin review).
        Route::post('admin/pedidos/{pedido}/review-link', [\App\Http\Controllers\Api\ReviewController::class, 'ensureForPedido']);

        // Programa de referidos
        Route::get('referidos', [\App\Http\Controllers\Api\ReferidoController::class, 'index']);

        // Categorías
        Route::apiResource('categorias', CategoriaController::class);

        // Productos
        Route::apiResource('productos',  ProductoController::class);
        Route::post('productos/{id}/restore', [ProductoController::class, 'restore']);

        // Recetas (anidadas bajo producto) — gated
        Route::middleware('feature:recetas')->group(function () {
            Route::get('productos/{producto}/recetas', [RecetaController::class, 'index']);
            Route::put('productos/{producto}/recetas', [RecetaController::class, 'sync']);
            Route::delete('recetas/{receta}',          [RecetaController::class, 'destroy']);
        });

        // Ingredientes — gated
        Route::middleware('feature:inventario')->group(function () {
            Route::get('ingredientes/export', [IngredienteController::class, 'export'])->name('ingredientes.export');
            Route::apiResource('ingredientes', IngredienteController::class);
            Route::post('ingredientes/{ingrediente}/ajuste',         [IngredienteController::class, 'ajustar']);
            Route::get('ingredientes/{ingrediente}/movimientos',     [IngredienteController::class, 'movimientos']);
        });

        // Compras a proveedor — gated
        Route::middleware('feature:compras')->group(function () {
            Route::get('compras',             [CompraController::class, 'index']);
            Route::post('compras',            [CompraController::class, 'store']);
            Route::get('compras/{compra}',    [CompraController::class, 'show']);
            Route::delete('compras/{compra}', [CompraController::class, 'destroy']);
            Route::post('compras/{id}/restore', [CompraController::class, 'restore']);
        });

        // Notificaciones in-app del local — gated
        Route::middleware('feature:notificaciones')->group(function () {
            Route::get('notificaciones',                             [NotificacionController::class, 'index']);
            Route::post('notificaciones/leer-todas',                 [NotificacionController::class, 'leerTodas']);
            Route::post('notificaciones/{notificacion}/leer',        [NotificacionController::class, 'leer']);
        });

        // Pedidos (admin del local)
        Route::get('pedidos',                       [PedidoController::class, 'index']);
        Route::get('pedidos/export',                [PedidoController::class, 'export'])->name('pedidos.export');
        Route::post('pedidos',                      [PedidoController::class, 'store']);   // POS / venta en sucursal
        Route::get('pedidos/{pedido}',              [PedidoController::class, 'show']);
        Route::patch('pedidos/{pedido}/estado',     [PedidoController::class, 'updateEstado']);
        Route::delete('pedidos/{pedido}',           [PedidoController::class, 'destroy']);
        Route::post('pedidos/{id}/restore',         [PedidoController::class, 'restore']);
        // Force-delete: borra permanentemente (incluye soft-deleted). Sin restauración.
        Route::delete('pedidos/{id}/force',         [PedidoController::class, 'forceDestroy']);

        // Uploads
        Route::post('uploads/image', [UploadController::class, 'store'])
            ->middleware('throttle:30,1');
    });

    // ─── Super admin (global, sin tenant scope) ───────────────────────
    Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {
        // F30 — Dashboard MRR/ARR/Churn/conv para super_admin
        Route::get('saas-metrics', [\App\Http\Controllers\Api\Admin\SaasMetricsController::class, 'index']);

        Route::get('locales',                       [AdminLocalController::class, 'index']);
        Route::post('locales',                      [AdminLocalController::class, 'store']);
        Route::get('locales/{local:id}',               [AdminLocalController::class, 'show']);
        Route::patch('locales/{local:id}',             [AdminLocalController::class, 'update']);
        Route::delete('locales/{local:id}',            [AdminLocalController::class, 'destroy']);
        Route::post('locales/{id}/restore',            [AdminLocalController::class, 'restore']);
        Route::post('locales/{local:id}/suspender',    [AdminLocalController::class, 'suspender']);
        Route::post('locales/{local:id}/reactivar',    [AdminLocalController::class, 'reactivar']);
        Route::patch('locales/{local:id}/billing',     [AdminLocalController::class, 'updateBilling']);

        // F76 — feedback de cancelación agregado para super
        Route::get('cancel-feedback', [\App\Http\Controllers\Api\CancellationFeedbackController::class, 'summary']);

        // F71 — asignación de locales a users (multi-sucursal)
        Route::get('users/{user}/locales',                 [\App\Http\Controllers\Api\UserLocalesController::class, 'listForUser']);
        Route::post('users/{user}/locales',                [\App\Http\Controllers\Api\UserLocalesController::class, 'attachToUser']);
        Route::delete('users/{user}/locales/{localId}',    [\App\Http\Controllers\Api\UserLocalesController::class, 'detachFromUser']);

        // Gestión de contraseñas de usuarios del local
        Route::get('locales/{local:id}/usuarios',           [PasswordController::class, 'localUsers']);
        Route::patch('locales/{local:id}/owner-password',   [PasswordController::class, 'resetLocalOwner'])
            ->middleware('throttle:10,1');
        // F100f — Editar datos del usuario del local (nombre, email) desde super_admin
        Route::patch('users/{user}/profile',                [PasswordController::class, 'updateUserProfile'])
            ->middleware('throttle:30,1');

        // F92 — Módulos super_admin globales (anuncios, cupones plantilla, newsletter, tickets, zonas, auditoría)
        Route::get('audit-logs',                              [\App\Http\Controllers\Api\Admin\AuditLogGlobalController::class, 'index']);

        Route::get('anuncios',                                [\App\Http\Controllers\Api\Admin\AnunciosController::class, 'index']);
        Route::post('anuncios',                               [\App\Http\Controllers\Api\Admin\AnunciosController::class, 'store']);
        Route::patch('anuncios/{anuncio}',                    [\App\Http\Controllers\Api\Admin\AnunciosController::class, 'update']);
        Route::delete('anuncios/{anuncio}',                   [\App\Http\Controllers\Api\Admin\AnunciosController::class, 'destroy']);

        Route::get('cupones-globales',                        [\App\Http\Controllers\Api\Admin\CuponesGlobalesController::class, 'index']);
        Route::post('cupones-globales',                       [\App\Http\Controllers\Api\Admin\CuponesGlobalesController::class, 'store']);
        Route::post('cupones-globales/{cupon}/sync',          [\App\Http\Controllers\Api\Admin\CuponesGlobalesController::class, 'sync']);
        Route::delete('cupones-globales/{cupon}',             [\App\Http\Controllers\Api\Admin\CuponesGlobalesController::class, 'destroy']);

        Route::get('newsletter',                              [\App\Http\Controllers\Api\Admin\NewsletterController::class, 'index']);
        Route::post('newsletter/send',                        [\App\Http\Controllers\Api\Admin\NewsletterController::class, 'send'])
            ->middleware('throttle:5,1');

        Route::get('tickets',                                 [\App\Http\Controllers\Api\Admin\TicketsController::class, 'index']);
        Route::post('tickets/{ticket}/responder',             [\App\Http\Controllers\Api\Admin\TicketsController::class, 'responder']);
        Route::post('tickets/{ticket}/cerrar',                [\App\Http\Controllers\Api\Admin\TicketsController::class, 'cerrar']);

        Route::get('metricas-zonas',                          [\App\Http\Controllers\Api\Admin\MetricasZonasController::class, 'index']);

        // F99 — Feed unificado de notificaciones para super_admin
        Route::get('notificaciones',                          [\App\Http\Controllers\Api\Admin\NotificacionesController::class, 'index']);

        // F98 — Email templates editables (sustituyen los Blade hardcoded de los Mailables)
        Route::get('email-templates',                         [\App\Http\Controllers\Api\Admin\EmailTemplatesController::class, 'index']);
        Route::post('email-templates',                        [\App\Http\Controllers\Api\Admin\EmailTemplatesController::class, 'store']);
        Route::patch('email-templates/{template}',            [\App\Http\Controllers\Api\Admin\EmailTemplatesController::class, 'update']);
        Route::delete('email-templates/{template}',           [\App\Http\Controllers\Api\Admin\EmailTemplatesController::class, 'destroy']);
        Route::post('email-templates/preview',                [\App\Http\Controllers\Api\Admin\EmailTemplatesController::class, 'preview']);
    });
});
