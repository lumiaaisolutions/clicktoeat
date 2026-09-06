<?php

use App\Http\Controllers\Api\Admin\AnunciosController;
use App\Http\Controllers\Api\Admin\AuditLogGlobalController;
use App\Http\Controllers\Api\Admin\ClickyController;
use App\Http\Controllers\Api\Admin\CuponesGlobalesController;
use App\Http\Controllers\Api\Admin\EmailTemplatesController;
use App\Http\Controllers\Api\Admin\LocalController as AdminLocalController;
use App\Http\Controllers\Api\Admin\MetricasZonasController;
use App\Http\Controllers\Api\Admin\NewsletterController;
use App\Http\Controllers\Api\Admin\NotificacionesController;
use App\Http\Controllers\Api\Admin\SaasMetricsController;
use App\Http\Controllers\Api\Admin\TicketsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CajaController;
use App\Http\Controllers\Api\CampanaController;
use App\Http\Controllers\Api\CancellationFeedbackController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\CompraController;
use App\Http\Controllers\Api\CuentaMesaController;
use App\Http\Controllers\Api\CuponController;
use App\Http\Controllers\Api\GastoController;
use App\Http\Controllers\Api\GiftCardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\HorarioController;
use App\Http\Controllers\Api\IngredienteController;
use App\Http\Controllers\Api\LealtadChallengeController;
use App\Http\Controllers\Api\LealtadTierController;
use App\Http\Controllers\Api\LocalController;
use App\Http\Controllers\Api\MesaController;
use App\Http\Controllers\Api\MetricasController;
use App\Http\Controllers\Api\MobileDeviceController;
use App\Http\Controllers\Api\NotificacionController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\OutgoingWebhookController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\PisoController;
use App\Http\Controllers\Api\ProductoController;
use App\Http\Controllers\Api\Public\CarritoAbandonadoController;
use App\Http\Controllers\Api\Public\DataDeletionController;
use App\Http\Controllers\Api\Public\LoyaltyController;
use App\Http\Controllers\Api\Public\MenuController;
use App\Http\Controllers\Api\Public\PedidoController as PublicPedidoController;
use App\Http\Controllers\Api\Public\ResenaController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\RecetaController;
use App\Http\Controllers\Api\ReferidoController;
use App\Http\Controllers\Api\ReservacionController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SalonController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SignupController;
use App\Http\Controllers\Api\StaffAttendanceController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\StaffShiftController;
use App\Http\Controllers\Api\TwoFactorController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\UserLocalesController;
use App\Http\Controllers\Api\WebhookController;
use App\Models\AnuncioGlobal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Auto-prefixed with /api/v1 by bootstrap/app.php.
*/

// Health endpoint deep — fuera del throttle pero con rate limit propio.
// Útil para uptimerobot/pingdom. /up sigue siendo el liveness simple.
Route::get('health/deep', [HealthController::class, 'deep'])
    ->middleware('throttle:30,1');

Route::middleware('throttle:60,1')->group(function () {

    // ─── Public ───────────────────────────────────────────────────────
    Route::prefix('public')->group(function () {

        // Derecho de borrado (LFPDPPP / GDPR). 3 solicitudes / hora por IP.
        Route::post('borrar-mis-datos', [DataDeletionController::class, 'request'])
            ->middleware('throttle:3,60');

        // Estado de sellos de lealtad por email
        Route::post('lealtad/{slug}/status', [LoyaltyController::class, 'status'])
            ->middleware('throttle:30,1');

        // Tracking de carrito abandonado (F75)
        Route::post('carrito-abandonado/{slug}', [CarritoAbandonadoController::class, 'track'])
            ->middleware('throttle:30,1');

        Route::get('menu/{slug}', [MenuController::class, 'show'])->name('public.menu.show');
        Route::get('locales', [MenuController::class, 'index'])->name('public.locales.index');

        // Carrusel de login/registro (config global super_admin) — solo lectura pública.
        Route::get('auth-carousel', [App\Http\Controllers\Api\Public\AuthCarouselController::class, 'index']);
        // Rate limit por tenant (100/min por local) + IP fallback (20/min) + idempotency.
        // Ver: AppServiceProvider::configureRateLimiting + docs/api/rate-limits.md
        Route::post('pedidos/{slug}', [PublicPedidoController::class, 'store'])
            ->middleware(['throttle:public-orders-by-tenant', 'idempotent:24h'])
            ->name('public.pedidos.store');

        // Validación pública de cupón antes del checkout.
        Route::post('cupones/{slug}/validar',
            [App\Http\Controllers\Api\Public\CuponController::class, 'validar'])
            ->middleware('throttle:30,1');
        // F100 — Cupones destacados activos AHORA para banner en landing
        Route::get('cupones/{slug}/destacados',
            [App\Http\Controllers\Api\Public\CuponController::class, 'destacados']);

        // Reseñas públicas POR PRODUCTO — el cliente reseña un producto específico
        Route::post('resenas/{pedidoCodigo}',
            [ResenaController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('resenas/{slug}/{producto_id}',
            [ResenaController::class, 'porProducto']);

        // F100 — Calificación GENERAL del local (rating + comentario por token)
        Route::get('reviews/local/{slug}', [ReviewController::class, 'indexForLocal']);
        Route::get('reviews/token/{token}', [ReviewController::class, 'showByToken']);
        Route::post('reviews/token/{token}', [ReviewController::class, 'submitByToken'])
            ->middleware('throttle:5,1');

        // F102 — Mesa (QR de salón). Gated internamente por Features::DINE_IN.
        Route::get('mesa/{qrToken}', [App\Http\Controllers\Api\Public\MesaController::class, 'show']);
        Route::post('mesa/{qrToken}/pedidos', [App\Http\Controllers\Api\Public\MesaController::class, 'storePedido'])
            ->middleware(['throttle:public-orders-by-mesa', 'idempotent:24h']);
        Route::post('mesa/{qrToken}/llamar-mesero', [App\Http\Controllers\Api\Public\MesaController::class, 'llamarMesero'])
            ->middleware('throttle:20,1');
    });

    // ─── Billing (SaaS) ───────────────────────────────────────────────
    Route::prefix('billing')->group(function () {
        Route::get('plans', [BillingController::class, 'plans']);
        Route::post('checkout', [BillingController::class, 'checkout'])
            ->middleware('throttle:10,1');
        Route::get('session/{sessionId}', [BillingController::class, 'session'])
            ->middleware('throttle:30,1');
    });

    // ─── Onboarding (post-checkout, requiere onboarding_token) ────────
    Route::prefix('onboarding')->middleware('throttle:30,1')->group(function () {
        Route::post('password', [OnboardingController::class, 'password']);
        Route::post('local', [OnboardingController::class, 'local']);
        Route::post('branding', [OnboardingController::class, 'branding']);
        Route::post('contacto', [OnboardingController::class, 'contacto']);
        Route::post('finalizar', [OnboardingController::class, 'finalizar']);
        Route::post('upload', [OnboardingController::class, 'uploadImagen']);
    });

    // ─── Webhooks de Stripe (sin auth, verificados por firma) ─────────
    Route::post('webhooks/stripe', [WebhookController::class, 'stripe'])
        ->name('webhooks.stripe');

    // Backwards-friendly alias
    Route::get('menu/{slug}', [MenuController::class, 'show']);

    // ─── Auth ─────────────────────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        // Route-level: 30/min/IP (red ancha); el rate limiter manual del controller filtra por email (5/min).
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:30,1');

        // F89 — self-service signup (user sin local todavía)
        Route::post('signup-prospect', [SignupController::class, 'prospect'])
            ->middleware('throttle:5,1');

        // Reset de contraseña por email
        Route::post('forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:5,1');
        Route::post('reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('me', [AuthController::class, 'me']);
            Route::post('logout', [AuthController::class, 'logout']);
            Route::patch('me/password', [PasswordController::class, 'updateOwn'])
                ->middleware('throttle:5,1');

            // 2FA TOTP (F67)
            Route::get('2fa/status', [TwoFactorController::class, 'status']);
            Route::post('2fa/setup', [TwoFactorController::class, 'setup'])->middleware('throttle:10,1');
            Route::post('2fa/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:10,1');
            Route::post('2fa/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:10,1');
        });
    });

    // ─── Authenticated (tenant-scoped) ────────────────────────────────
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {

        Route::get('dashboard', function () {
            $user = request()->user();

            return response()->json([
                'mensaje' => "Hola, {$user->nombre}",
                'rol' => $user->rol,
                'local_id' => $user->local_id,
            ]);
        });

        // F71 — Multi-sucursal
        Route::get('me/locales', [UserLocalesController::class, 'myLocales']);
        Route::post('me/switch-local/{localId}', [UserLocalesController::class, 'switchLocal']);

        // F84 — filtro de notificación del propio user (movido aquí del grupo auth/ porque el frontend lo llama sin prefijo)
        Route::get('me/notif-filtro', function (Request $r) {
            return response()->json(['data' => ['notif_filtro' => $r->user()->notif_filtro ?? 'todos']]);
        });
        Route::patch('me/notif-filtro', function (Request $r) {
            $r->validate(['notif_filtro' => ['required', 'in:todos,cocina,caja,delivery,ninguno']]);
            $u = $r->user();
            $u->notif_filtro = $r->input('notif_filtro');
            $u->save();

            return response()->json(['data' => ['notif_filtro' => $u->notif_filtro]]);
        });

        // Banner global de anuncios del super (visible para todos)
        Route::get('anuncios/activos', function (Request $r) {
            $u = $r->user();
            $items = AnuncioGlobal::query()
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
        Route::get('soporte/tickets', [TicketsController::class, 'listForOwner']);
        Route::post('soporte/tickets', [TicketsController::class, 'storeForOwner']);
        Route::post('soporte/tickets/{ticket}/reply', [TicketsController::class, 'replyAsOwner']);

        // F85 — búsqueda global Cmd+K
        Route::get('search', [SearchController::class, 'search'])
            ->middleware('throttle:60,1');

        // Local (mío) — branding y configuración
        Route::get('local', [LocalController::class, 'show']);
        Route::patch('local', [LocalController::class, 'update']);

        // F103 — Clicky, asistente de IA del panel (Professional/Premium)
        Route::post('clicky/ask', [ClickyController::class, 'ask'])
            ->middleware(['feature:clicky_assistant', 'throttle:clicky']);

        // Cancellation feedback (F76)
        Route::post('billing/cancel-feedback', [CancellationFeedbackController::class, 'store'])
            ->middleware('throttle:5,1');

        // F90 — Webhooks outgoing (sólo Premium via feature gate)
        Route::middleware('feature:api_webhooks')->group(function () {
            Route::get('webhooks', [OutgoingWebhookController::class, 'index']);
            Route::post('webhooks', [OutgoingWebhookController::class, 'store']);
            Route::patch('webhooks/{webhook}', [OutgoingWebhookController::class, 'update']);
            Route::delete('webhooks/{webhook}', [OutgoingWebhookController::class, 'destroy']);
        });

        // Web Push — VAPID + suscripciones del browser
        Route::get('push/vapid-public-key', [PushSubscriptionController::class, 'publicKey']);
        Route::post('push/subscribe', [PushSubscriptionController::class, 'subscribe'])
            ->middleware('throttle:20,1');
        Route::post('push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe'])
            ->middleware('throttle:20,1');

        // App móvil (iOS/Android) — registro de token de Expo Push
        Route::post('mobile/register-device', [MobileDeviceController::class, 'register'])
            ->middleware('throttle:20,1');
        Route::post('mobile/unregister-device', [MobileDeviceController::class, 'unregister'])
            ->middleware('throttle:20,1');

        // Horarios (gestión dedicada)
        Route::get('local/horarios', [HorarioController::class, 'show']);
        Route::patch('local/horarios', [HorarioController::class, 'update']);

        // Staff del local (gestión del equipo — sólo owner)
        Route::get('local/staff', [StaffController::class, 'index']);
        Route::post('local/staff', [StaffController::class, 'store']);
        Route::get('local/staff/{staff}', [StaffController::class, 'show']);
        Route::patch('local/staff/{staff}', [StaffController::class, 'update']);
        Route::delete('local/staff/{staff}', [StaffController::class, 'destroy']);

        // Métricas / reportes — gated por plan
        Route::middleware('feature:metricas_basicas')->group(function () {
            Route::get('metricas', [MetricasController::class, 'index']);
            Route::get('metricas/utilidad', [MetricasController::class, 'utilidad']);
        });

        // Audit log del local (sólo owner) — gated por plan (Premium)
        Route::get('audit-logs', [AuditLogController::class, 'index'])
            ->middleware('feature:audit_log');

        // Billing — Customer Portal de Stripe (cambiar plan, cancelar, facturas)
        Route::get('billing/portal', [BillingController::class, 'portal']);
        // F100g — Activa local existente (sin stripe_customer) vinculando una
        // nueva subscription al local actual vía client_reference_id.
        Route::post('billing/activate-existing', [BillingController::class, 'activateExisting']);

        // Cupones / descuentos
        Route::apiResource('cupones', CuponController::class);
        Route::post('cupones/{cupon}/toggle', [CuponController::class, 'toggle']);

        // F101 — Gastos operativos (luz, agua, gas, renta, etc.)
        // Distinto de `compras` (inventario de insumos). Esto es OPEX puro.
        Route::get('gastos/resumen', [GastoController::class, 'resumen']);
        Route::get('gastos/export', [GastoController::class, 'exportCsv']);
        Route::post('gastos/{gasto}/comprobante', [GastoController::class, 'subirComprobante']);
        Route::delete('gastos/{gasto}/comprobante', [GastoController::class, 'eliminarComprobante']);
        Route::apiResource('gastos', GastoController::class);

        // F100 — Reviews/calificaciones del local (moderación owner)
        Route::get('admin/reviews', [ReviewController::class, 'indexAdmin']);
        Route::patch('admin/reviews/{review}/toggle', [ReviewController::class, 'toggleAprobado']);
        Route::delete('admin/reviews/{review}', [ReviewController::class, 'destroyAdmin']);
        // Genera (o recupera) el token de review de un pedido. Permite que el
        // owner copie el link aunque el pedido entregado sea legacy (sin review).
        Route::post('admin/pedidos/{pedido}/review-link', [ReviewController::class, 'ensureForPedido']);

        // Programa de referidos
        Route::get('referidos', [ReferidoController::class, 'index']);

        // Categorías
        Route::apiResource('categorias', CategoriaController::class);

        // Productos
        Route::apiResource('productos', ProductoController::class);
        Route::post('productos/{id}/restore', [ProductoController::class, 'restore']);

        // Recetas (anidadas bajo producto) — gated
        Route::middleware('feature:recetas')->group(function () {
            Route::get('productos/{producto}/recetas', [RecetaController::class, 'index']);
            Route::put('productos/{producto}/recetas', [RecetaController::class, 'sync']);
            Route::delete('recetas/{receta}', [RecetaController::class, 'destroy']);
        });

        // Ingredientes — gated
        Route::middleware('feature:inventario')->group(function () {
            Route::get('ingredientes/export', [IngredienteController::class, 'export'])->name('ingredientes.export');
            Route::apiResource('ingredientes', IngredienteController::class);
            Route::post('ingredientes/{ingrediente}/ajuste', [IngredienteController::class, 'ajustar']);
            Route::get('ingredientes/{ingrediente}/movimientos', [IngredienteController::class, 'movimientos']);
        });

        // Compras a proveedor — gated
        Route::middleware('feature:compras')->group(function () {
            Route::get('compras', [CompraController::class, 'index']);
            Route::post('compras', [CompraController::class, 'store']);
            Route::get('compras/{compra}', [CompraController::class, 'show']);
            Route::delete('compras/{compra}', [CompraController::class, 'destroy']);
            Route::post('compras/{id}/restore', [CompraController::class, 'restore']);
        });

        // Notificaciones in-app del local — gated
        Route::middleware('feature:notificaciones')->group(function () {
            Route::get('notificaciones', [NotificacionController::class, 'index']);
            Route::post('notificaciones/leer-todas', [NotificacionController::class, 'leerTodas']);
            Route::post('notificaciones/{notificacion}/leer', [NotificacionController::class, 'leer']);
        });

        // Pedidos (admin del local)
        Route::get('pedidos', [PedidoController::class, 'index']);
        Route::get('pedidos/export', [PedidoController::class, 'export'])->name('pedidos.export');
        Route::post('pedidos', [PedidoController::class, 'store']);   // POS / venta en sucursal
        Route::get('pedidos/{pedido}', [PedidoController::class, 'show']);
        Route::patch('pedidos/{pedido}/estado', [PedidoController::class, 'updateEstado']);
        Route::delete('pedidos/{pedido}', [PedidoController::class, 'destroy']);
        Route::post('pedidos/{id}/restore', [PedidoController::class, 'restore']);
        // Force-delete: borra permanentemente (incluye soft-deleted). Sin restauración.
        Route::delete('pedidos/{id}/force', [PedidoController::class, 'forceDestroy']);

        // Uploads
        Route::post('uploads/image', [UploadController::class, 'store'])
            ->middleware('throttle:30,1');

        // F102 — Operación de salón (dine-in). Gated por Premium.
        Route::middleware('feature:dine_in')->group(function () {
            Route::apiResource('pisos', PisoController::class)->except(['show']);
            Route::apiResource('mesas', MesaController::class)->except(['show']);
            Route::get('mesas/{mesa}', [MesaController::class, 'show']);
            Route::post('mesas/{mesa}/tomar', [MesaController::class, 'tomar'])->middleware('permiso:mesero');
            Route::post('mesas/{mesa}/liberar', [MesaController::class, 'liberar'])->middleware('permiso:mesero');

            Route::get('salon/cocina/pedidos', [SalonController::class, 'pedidosCocina'])->middleware('permiso:cocina');
            Route::patch('detalle-pedidos/{detalle}/estado', [SalonController::class, 'actualizarDetalleEstado'])->middleware('permiso:cocina');
            Route::middleware('permiso:mesero')->group(function () {
                Route::get('salon/mesero/pedidos', [SalonController::class, 'pedidosMesero']);
                Route::get('salon/llamados', [SalonController::class, 'llamadosPendientes']);
                Route::post('salon/llamados/{llamado}/atender', [SalonController::class, 'atenderLlamado']);
            });
        });

        // F102 — Dinero: cuenta de mesa + caja física. Gated por Premium + permiso caja.
        Route::middleware(['feature:caja_fisica', 'permiso:caja'])->group(function () {
            Route::get('cuentas-mesa', [CuentaMesaController::class, 'index']);
            Route::get('cuentas-mesa/{cuenta}', [CuentaMesaController::class, 'show']);
            Route::post('cuentas-mesa/{cuenta}/pre-cuenta', [CuentaMesaController::class, 'preCuenta']);
            Route::post('cuentas-mesa/{cuenta}/transferir', [CuentaMesaController::class, 'transferir']);
            Route::post('cuentas-mesa/{cuenta}/unir', [CuentaMesaController::class, 'unir']);
            Route::post('cuentas-mesa/{cuenta}/gift-card', [CuentaMesaController::class, 'aplicarGiftCard']);
            Route::post('cuentas-mesa/{cuenta}/cerrar', [CuentaMesaController::class, 'cerrar']);

            // "Todo por caja" (Fase D): mostrador arma pedido en Venta y se cobra aquí.
            Route::get('caja/pendientes', [CajaController::class, 'pendientesMostrador']);
            Route::post('pedidos/{pedido}/cobrar', [CajaController::class, 'cobrarPedido']);

            Route::get('cajas', [CajaController::class, 'index']);
            Route::post('cajas', [CajaController::class, 'store']);
            Route::get('cajas/{caja}', [CajaController::class, 'show']);
            Route::post('cajas/{caja}/abrir-corte', [CajaController::class, 'abrirCorte']);
            Route::post('cortes-caja/{corte}/movimientos', [CajaController::class, 'agregarMovimiento']);
            Route::post('cortes-caja/{corte}/cerrar', [CajaController::class, 'cerrarCorte']);
        });

        // F102 Etapa C — reporte consolidado de la organización del owner. Ver ADR-014.
        Route::middleware('feature:sucursales_consolidadas')->group(function () {
            Route::get('organizations/mine', [OrganizationController::class, 'mine']);
        });

        // F102 Etapa D — reservaciones, loyalty tiers/challenges, gift cards, campañas, turnos.
        Route::middleware('feature:reservaciones')->group(function () {
            Route::apiResource('reservaciones', ReservacionController::class)->except(['show']);
        });
        Route::middleware('feature:loyalty_tiers')->group(function () {
            Route::apiResource('lealtad-tiers', LealtadTierController::class)->except(['show']);
            Route::apiResource('lealtad-challenges', LealtadChallengeController::class)->except(['show']);
        });
        Route::middleware('feature:gift_cards')->group(function () {
            Route::get('gift-cards', [GiftCardController::class, 'index']);
            Route::post('gift-cards', [GiftCardController::class, 'store']);
        });
        Route::middleware('feature:campanas')->group(function () {
            Route::apiResource('campanas', CampanaController::class)->except(['show', 'update']);
            Route::post('campanas/{campana}/enviar', [CampanaController::class, 'enviar']);
        });
        Route::middleware('feature:rrhh_turnos')->group(function () {
            Route::apiResource('staff-shifts', StaffShiftController::class)->except(['show', 'update']);
            Route::get('staff-shifts-forecast', [StaffShiftController::class, 'forecast']);

            Route::get('asistencias', [StaffAttendanceController::class, 'index']);
            Route::get('asistencias/estado', [StaffAttendanceController::class, 'estado']);
            Route::post('asistencias/entrada', [StaffAttendanceController::class, 'entrada']);
            Route::post('asistencias/salida', [StaffAttendanceController::class, 'salida']);
            Route::delete('asistencias/{asistencia}', [StaffAttendanceController::class, 'destroy']);
        });
    });

    // ─── Super admin (global, sin tenant scope) ───────────────────────
    Route::middleware(['auth:sanctum', 'super_admin'])->prefix('admin')->group(function () {
        // F30 — Dashboard MRR/ARR/Churn/conv para super_admin
        Route::get('saas-metrics', [SaasMetricsController::class, 'index']);

        Route::get('locales', [AdminLocalController::class, 'index']);
        Route::post('locales', [AdminLocalController::class, 'store']);
        Route::get('locales/{local:id}', [AdminLocalController::class, 'show']);
        Route::patch('locales/{local:id}', [AdminLocalController::class, 'update']);
        Route::delete('locales/{local:id}', [AdminLocalController::class, 'destroy']);
        Route::post('locales/{id}/restore', [AdminLocalController::class, 'restore']);
        Route::post('locales/{local:id}/suspender', [AdminLocalController::class, 'suspender']);
        Route::post('locales/{local:id}/reactivar', [AdminLocalController::class, 'reactivar']);
        Route::patch('locales/{local:id}/billing', [AdminLocalController::class, 'updateBilling']);

        // F76 — feedback de cancelación agregado para super
        Route::get('cancel-feedback', [CancellationFeedbackController::class, 'summary']);

        // F71 — asignación de locales a users (multi-sucursal)
        Route::get('users/{user}/locales', [UserLocalesController::class, 'listForUser']);
        Route::post('users/{user}/locales', [UserLocalesController::class, 'attachToUser']);
        Route::delete('users/{user}/locales/{localId}', [UserLocalesController::class, 'detachFromUser']);

        // F102 Etapa C — organizaciones (sucursales consolidadas). Ver ADR-014.
        Route::get('organizations', [App\Http\Controllers\Api\Admin\OrganizationController::class, 'index']);
        Route::post('organizations', [App\Http\Controllers\Api\Admin\OrganizationController::class, 'store']);
        Route::post('organizations/{organization}/locales', [App\Http\Controllers\Api\Admin\OrganizationController::class, 'asignarLocal']);
        Route::delete('organizations/{organization}/locales/{localId}', [App\Http\Controllers\Api\Admin\OrganizationController::class, 'desasignarLocal']);

        // Gestión de contraseñas de usuarios del local
        Route::get('locales/{local:id}/usuarios', [PasswordController::class, 'localUsers']);
        Route::patch('locales/{local:id}/owner-password', [PasswordController::class, 'resetLocalOwner'])
            ->middleware('throttle:10,1');
        // F100f — Editar datos del usuario del local (nombre, email) desde super_admin
        Route::patch('users/{user}/profile', [PasswordController::class, 'updateUserProfile'])
            ->middleware('throttle:30,1');

        // F92 — Módulos super_admin globales (anuncios, cupones plantilla, newsletter, tickets, zonas, auditoría)
        Route::get('audit-logs', [AuditLogGlobalController::class, 'index']);

        Route::get('anuncios', [AnunciosController::class, 'index']);
        Route::post('anuncios', [AnunciosController::class, 'store']);
        Route::patch('anuncios/{anuncio}', [AnunciosController::class, 'update']);
        Route::delete('anuncios/{anuncio}', [AnunciosController::class, 'destroy']);

        Route::get('cupones-globales', [CuponesGlobalesController::class, 'index']);
        Route::post('cupones-globales', [CuponesGlobalesController::class, 'store']);
        Route::post('cupones-globales/{cupon}/sync', [CuponesGlobalesController::class, 'sync']);
        Route::delete('cupones-globales/{cupon}', [CuponesGlobalesController::class, 'destroy']);

        Route::get('newsletter', [NewsletterController::class, 'index']);
        Route::post('newsletter/send', [NewsletterController::class, 'send'])
            ->middleware('throttle:5,1');

        Route::get('tickets', [TicketsController::class, 'index']);
        Route::post('tickets/{ticket}/responder', [TicketsController::class, 'responder']);
        Route::post('tickets/{ticket}/cerrar', [TicketsController::class, 'cerrar']);

        Route::get('metricas-zonas', [MetricasZonasController::class, 'index']);

        // F99 — Feed unificado de notificaciones para super_admin
        Route::get('notificaciones', [NotificacionesController::class, 'index']);

        // F98 — Email templates editables (sustituyen los Blade hardcoded de los Mailables)
        Route::get('email-templates', [EmailTemplatesController::class, 'index']);
        Route::post('email-templates', [EmailTemplatesController::class, 'store']);
        Route::patch('email-templates/{template}', [EmailTemplatesController::class, 'update']);
        Route::delete('email-templates/{template}', [EmailTemplatesController::class, 'destroy']);
        Route::post('email-templates/preview', [EmailTemplatesController::class, 'preview']);

        // Carrusel de login/registro (config global de plataforma)
        Route::get('auth-carousel', [App\Http\Controllers\Api\Admin\AuthCarouselController::class, 'index']);
        Route::post('auth-carousel', [App\Http\Controllers\Api\Admin\AuthCarouselController::class, 'store']);
        Route::post('auth-carousel/upload', [App\Http\Controllers\Api\Admin\AuthCarouselController::class, 'upload'])
            ->middleware('throttle:30,1');
        Route::patch('auth-carousel/{slide}', [App\Http\Controllers\Api\Admin\AuthCarouselController::class, 'update']);
        Route::delete('auth-carousel/{slide}', [App\Http\Controllers\Api\Admin\AuthCarouselController::class, 'destroy']);
    });
});
