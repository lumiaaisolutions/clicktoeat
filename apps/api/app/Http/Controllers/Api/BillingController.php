<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StartCheckoutRequest;
use App\Models\OnboardingToken;
use App\Models\Plan;
use App\Models\Local;
use App\Services\Billing\StripeClientFactory;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Endpoints de cobro recurrente con Stripe Checkout + Customer Portal.
 *
 * - POST /billing/checkout       Inicia Checkout Session (público).
 * - GET  /billing/session/{id}   Verifica el resultado + emite onboarding_token.
 * - GET  /billing/plans          Lista de planes activos (público — para pricing UI).
 * - GET  /billing/portal         Genera URL del Customer Portal (autenticado).
 *
 * SEV-12 nota: cada endpoint protegido usa TenantContext + inline 403 si no
 * hay local (`if (! $local) return 403`). Los endpoints públicos (plans,
 * checkout, session) intencionalmente no requieren auth — son parte del
 * flujo de onboarding. Patrón consistente con BillingController de Stripe
 * Connect; no requiere Policy reusable porque cada endpoint tiene lógica
 * específica de Stripe (no es CRUD).
 */
class BillingController extends Controller
{
    public function __construct(
        private readonly StripeClientFactory $stripeFactory,
    ) {}

    /**
     * Lista los planes activos. Usado por la pricing UI del frontend.
     */
    public function plans(): JsonResponse
    {
        $plans = Plan::query()
            ->where('activo', true)
            ->orderBy('orden')
            ->get()
            ->map(fn (Plan $p) => [
                'id'                    => $p->id,   // F100: necesario para el BillingModal del super_admin
                'slug'                  => $p->slug,
                'nombre'                => $p->nombre,
                'precio_mxn'            => $p->priceMxn(),
                'precio_mxn_centavos'   => $p->precio_mxn_centavos,
                'features'              => $p->features,
                'limits' => [
                    'productos'   => $p->max_productos,
                    'categorias'  => $p->max_categorias,
                    'staff'       => $p->max_staff,
                ],
                'available_for_purchase' => ! empty($p->stripe_price_id),
            ]);

        return response()->json([
            'data'       => $plans,
            'trial_days' => config('stripe.trial_days', 14),
        ]);
    }

    /**
     * Crea una Stripe Checkout Session en modo subscription con trial sin
     * tarjeta. Devuelve la URL para redirigir al usuario.
     */
    public function checkout(StartCheckoutRequest $req): JsonResponse
    {
        $plan = Plan::query()
            ->where('slug', $req->validated('plan_slug'))
            ->where('activo', true)
            ->firstOrFail();

        if (empty($plan->stripe_price_id)) {
            return response()->json([
                'message' => 'Este plan aún no está disponible para suscripción. Contacta al equipo.',
                'code'    => 'PLAN_NOT_PROVISIONED',
            ], 503);
        }

        $payload = [
            'mode'                       => 'subscription',
            'payment_method_collection'  => 'if_required',
            'line_items'                 => [[
                'price'    => $plan->stripe_price_id,
                'quantity' => 1,
            ]],
            'subscription_data' => [
                'trial_period_days' => config('stripe.trial_days', 14),
                'metadata' => [
                    'plan_slug' => $plan->slug,
                ],
            ],
            'metadata' => [
                'plan_slug' => $plan->slug,
            ],
            'success_url'           => config('stripe.success_url'),
            'cancel_url'            => config('stripe.cancel_url'),
            'allow_promotion_codes' => true,
            'locale'                => config('stripe.locale', 'es-419'),
        ];

        // Solo incluimos customer_email si llegó uno válido. Stripe rechaza
        // string vacío con "Invalid email address: ".
        $email = $req->validated('email');
        if (! empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $payload['customer_email'] = $email;
        }

        try {
            $session = $this->stripeFactory->make()->checkout->sessions->create($payload);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            report($e);
            return response()->json([
                'message' => 'No pudimos iniciar el checkout: '.$e->getMessage(),
                'code'    => 'STRIPE_CHECKOUT_FAILED',
            ], 502);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'No pudimos iniciar el checkout. Intenta de nuevo.',
                'code'    => 'STRIPE_CHECKOUT_FAILED',
            ], 502);
        }

        return response()->json([
            'session_id'  => $session->id,
            'session_url' => $session->url,
        ]);
    }

    /**
     * Verifica el resultado del checkout y devuelve un onboarding_token
     * temporal para que el wizard pueda crear/configurar el Local.
     *
     * Si el webhook `checkout.session.completed` ya pasó, el Local ya existe;
     * si no, lo creamos ahora (stub) y el webhook hará un upsert.
     */
    public function session(string $sessionId): JsonResponse
    {
        try {
            $session = $this->stripeFactory->make()->checkout->sessions->retrieve($sessionId, [
                'expand' => ['subscription', 'subscription.items.data.price'],
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'Sesión inválida o expirada.',
                'code'    => 'STRIPE_SESSION_NOT_FOUND',
            ], 404);
        }

        // Stripe puede regresar 'complete' o 'open' (si todavía está pagando).
        if (! in_array($session->status, ['complete'], true)) {
            return response()->json([
                'message' => 'Pago aún no confirmado. Espera unos segundos.',
                'code'    => 'STRIPE_SESSION_NOT_COMPLETE',
                'status'  => $session->status,
            ], 202);
        }

        $plan = $this->planFromSession($session);

        $subscription = is_string($session->subscription)
            ? $this->stripeFactory->make()->subscriptions->retrieve($session->subscription)
            : $session->subscription;

        $trialEndsAt   = $subscription?->trial_end ? \Carbon\Carbon::createFromTimestamp($subscription->trial_end) : now()->addDays(config('stripe.trial_days', 14));
        $currentPeriod = $subscription?->current_period_end ? \Carbon\Carbon::createFromTimestamp($subscription->current_period_end) : null;

        // Idempotencia: si el webhook ya creó el local, lo reusamos.
        $local = Local::query()
            ->where('stripe_customer_id', $session->customer)
            ->orWhere('stripe_subscription_id', $subscription?->id)
            ->first();

        if (! $local) {
            $local = Local::create([
                'nombre'                  => 'Mi local',
                'slug'                    => 'pendiente-'.Str::random(10),
                'whatsapp'                => '',
                'color_primario'          => '#FF2D2D',
                'color_secundario'        => '#0B0B0F',
                'color_fondo'             => '#FAFAF7',
                'tipografia'              => 'Geist',
                'plan_id'                 => $plan->id,
                'plan_status'             => $subscription?->status ?? 'trialing',
                'stripe_customer_id'      => $session->customer,
                'stripe_subscription_id'  => $subscription?->id,
                'trial_ends_at'           => $trialEndsAt,
                'current_period_ends_at'  => $currentPeriod,
                'activo'                  => true,
            ]);
        }

        // Emitir token de onboarding (TTL 24h)
        $token = OnboardingToken::issueFor($local);

        return response()->json([
            'onboarding_token' => $token->value,
            'local_id'         => $local->id,
            'plan_slug'        => $plan->slug,
            'trial_ends_at'    => $local->trial_ends_at?->toIso8601String(),
        ]);
    }

    /**
     * F100g — Activa un local EXISTENTE (en trial manual o sin Stripe)
     * generando un Stripe Checkout vinculado a ese local específico vía
     * `client_reference_id`. El webhook usa este ID para vincular la
     * subscription al local existente sin crear uno nuevo.
     *
     * Usado por el botón "Agregar tarjeta y activar" del page /admin/billing
     * cuando el local todavía no tiene `stripe_customer_id`.
     */
    public function activateExisting(TenantContext $ctx): JsonResponse
    {
        $local = $ctx->local();
        if (! $local) {
            return response()->json(['message' => 'Sin tenant.'], 403);
        }
        if (! empty($local->stripe_customer_id)) {
            return response()->json([
                'message' => 'Este local ya tiene suscripción Stripe. Usa el portal en su lugar.',
                'code'    => 'ALREADY_HAS_CUSTOMER',
            ], 409);
        }
        $plan = $local->plan;
        if (! $plan || empty($plan->stripe_price_id)) {
            return response()->json([
                'message' => 'El plan del local no tiene precio configurado en Stripe.',
                'code'    => 'PLAN_NOT_PROVISIONED',
            ], 503);
        }

        // F100g — Calcular trial restante. Si al local todavía le quedan días
        // de prueba (trial_ends_at en el futuro), pasamos ese timestamp a
        // Stripe para que: (a) NO cobre hoy, (b) guarde la tarjeta, (c) cobre
        // AUTOMÁTICAMENTE al expirar el trial. Sin esto, Stripe asume "nueva
        // sub sin trial" y cobra $299 inmediato — sorpresa al cliente.
        //
        // Si el trial ya expiró (caso edge: el cron expire-manual aún no corrió),
        // usamos un mínimo de 1 hora para que de todos modos Stripe muestre
        // "MXN 0.00 due today" y no asuste al cliente al final del checkout.
        $trialEndTs = null;
        if ($local->trial_ends_at && $local->trial_ends_at->isFuture()) {
            $trialEndTs = $local->trial_ends_at->timestamp;
        } elseif ($local->plan_status === 'trialing') {
            $trialEndTs = now()->addHour()->timestamp;
        }

        $subscriptionData = [
            'metadata' => [
                'plan_slug'         => $plan->slug,
                'existing_local_id' => (string) $local->id,
            ],
        ];
        if ($trialEndTs) {
            $subscriptionData['trial_end'] = $trialEndTs;
            // Con trial activo, si el cliente NO completa el método de pago en
            // tiempo, Stripe cancela la sub automáticamente.
            $subscriptionData['trial_settings'] = [
                'end_behavior' => ['missing_payment_method' => 'cancel'],
            ];
        }

        $payload = [
            'mode'                       => 'subscription',
            // 'always' fuerza al cliente a capturar tarjeta. Combinado con
            // trial_end → checkout muestra "MXN 0.00 due today" pero pide
            // tarjeta para cobro futuro automático.
            'payment_method_collection'  => 'always',
            'line_items'                 => [[
                'price'    => $plan->stripe_price_id,
                'quantity' => 1,
            ]],
            'subscription_data'          => $subscriptionData,
            'metadata' => [
                'plan_slug'         => $plan->slug,
                'existing_local_id' => (string) $local->id,
            ],
            // client_reference_id es el identificador que el webhook usa primero
            // antes de buscar por customer/subscription. Formato "local:N".
            'client_reference_id'   => 'local:'.$local->id,
            'success_url'           => config('stripe.success_url'),
            'cancel_url'            => config('stripe.cancel_url'),
            'allow_promotion_codes' => true,
            'locale'                => config('stripe.locale', 'es-419'),
        ];

        // Pre-llenar email del owner si lo tenemos — Stripe lo usa para crear el customer.
        $ownerEmail = $local->owner?->email;
        if ($ownerEmail && filter_var($ownerEmail, FILTER_VALIDATE_EMAIL)) {
            $payload['customer_email'] = $ownerEmail;
        }

        try {
            $session = $this->stripeFactory->make()->checkout->sessions->create($payload);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'No pudimos iniciar el checkout. Intenta de nuevo.',
                'code'    => 'STRIPE_CHECKOUT_FAILED',
            ], 502);
        }

        return response()->json([
            'session_id'  => $session->id,
            'session_url' => $session->url,
        ]);
    }

    /**
     * Genera la URL del Customer Portal (cambiar plan, cancelar, ver facturas).
     * Requiere auth + tenant scope.
     */
    public function portal(TenantContext $ctx): JsonResponse
    {
        $local = $ctx->local();
        if (! $local) {
            return response()->json(['message' => 'Sin tenant.'], 403);
        }
        if (empty($local->stripe_customer_id)) {
            return response()->json([
                'message' => 'Este local no tiene suscripción activa.',
                'code'    => 'NO_STRIPE_CUSTOMER',
            ], 404);
        }

        try {
            $session = $this->stripeFactory->make()->billingPortal->sessions->create([
                'customer'   => $local->stripe_customer_id,
                'return_url' => config('stripe.portal_return_url'),
            ]);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'message' => 'No pudimos abrir el portal.',
                'code'    => 'STRIPE_PORTAL_FAILED',
            ], 502);
        }

        return response()->json(['url' => $session->url]);
    }

    private function planFromSession(\Stripe\Checkout\Session $session): Plan
    {
        // Preferimos el metadata 'plan_slug' que seteamos en checkout()
        $slug = $session->metadata['plan_slug'] ?? null;
        if ($slug) {
            $plan = Plan::where('slug', $slug)->first();
            if ($plan) return $plan;
        }

        // Fallback: mapear por stripe_price_id (caso edge cuando metadata se pierde)
        $subscription = is_object($session->subscription) ? $session->subscription : null;
        $priceId = $subscription?->items?->data[0]?->price?->id ?? null;
        if ($priceId) {
            $plan = Plan::where('stripe_price_id', $priceId)->first();
            if ($plan) return $plan;
        }

        throw new RuntimeException("No se pudo resolver el plan para session {$session->id}");
    }
}
