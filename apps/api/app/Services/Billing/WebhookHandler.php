<?php

namespace App\Services\Billing;

use App\Models\Local;
use App\Models\Plan;
use App\Models\SubscriptionEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Event;

/**
 * Dispatcher de eventos de Stripe a handlers idempotentes.
 *
 * Ver `docs/features/saas-billing.md#handlers-de-webhook` para la tabla
 * completa de eventos → acción.
 */
class WebhookHandler
{
    public function handle(Event $event, SubscriptionEvent $record): void
    {
        match ($event->type) {
            'checkout.session.completed'           => $this->onCheckoutCompleted($event, $record),
            'customer.subscription.created'        => $this->onSubscriptionUpsert($event, $record, isCreate: true),
            'customer.subscription.updated'        => $this->onSubscriptionUpsert($event, $record, isCreate: false),
            'customer.subscription.deleted'        => $this->onSubscriptionDeleted($event, $record),
            'customer.subscription.trial_will_end' => $this->onTrialWillEnd($event, $record),
            'invoice.paid'                         => $this->onInvoicePaid($event, $record),
            'invoice.payment_failed'               => $this->onInvoicePaymentFailed($event, $record),
            default => Log::info("Webhook Stripe ignorado: {$event->type}"),
        };
    }

    // ─── Handlers ───────────────────────────────────────────────────────

    private function onCheckoutCompleted(Event $event, SubscriptionEvent $record): void
    {
        $session = $event->data->object;          // Stripe\Checkout\Session
        $customerId     = $session->customer;
        $subscriptionId = $session->subscription;
        $planSlug       = $session->metadata['plan_slug'] ?? null;
        $plan           = $planSlug ? Plan::where('slug', $planSlug)->first() : null;

        DB::transaction(function () use ($customerId, $subscriptionId, $plan, $record) {
            $local = Local::query()
                ->where('stripe_customer_id', $customerId)
                ->orWhere('stripe_subscription_id', $subscriptionId)
                ->first();

            if (! $local) {
                // El frontend probablemente todavía no llamó a /billing/session.
                // Creamos el stub para que el siguiente subscription.* event no falle.
                $local = Local::create([
                    'nombre'                 => 'Mi local',
                    'slug'                   => 'pendiente-'.Str::random(10),
                    'whatsapp'               => '',
                    'color_primario'         => '#FF2D2D',
                    'color_secundario'       => '#0B0B0F',
                    'color_fondo'            => '#FAFAF7',
                    'tipografia'             => 'Geist',
                    'plan_id'                => $plan?->id,
                    'plan_status'            => 'trialing',
                    'stripe_customer_id'     => $customerId,
                    'stripe_subscription_id' => $subscriptionId,
                    'trial_ends_at'          => now()->addDays(config('stripe.trial_days', 14)),
                    'activo'                 => true,
                ]);
            } else {
                $local->fill([
                    'stripe_customer_id'     => $customerId,
                    'stripe_subscription_id' => $subscriptionId,
                ]);
                if ($plan && ! $local->plan_id) {
                    $local->plan_id = $plan->id;
                }
                $local->save();
            }

            $record->update(['local_id' => $local->id]);
        });
    }

    /**
     * Aplica para `customer.subscription.created` y `customer.subscription.updated`.
     * - Actualiza plan_id si el price cambió.
     * - Actualiza plan_status según el estado de Stripe.
     * - Actualiza current_period_ends_at y trial_ends_at.
     */
    private function onSubscriptionUpsert(Event $event, SubscriptionEvent $record, bool $isCreate): void
    {
        $sub = $event->data->object;  // Stripe\Subscription

        $local = Local::query()
            ->where('stripe_subscription_id', $sub->id)
            ->orWhere('stripe_customer_id', $sub->customer)
            ->first();

        if (! $local) {
            Log::warning("Webhook subscription.{$event->type}: local no encontrado para sub {$sub->id}");
            return;  // No es error fatal — puede ser un cliente externo
        }

        $priceId = $sub->items->data[0]->price->id ?? null;
        if ($priceId) {
            $plan = Plan::where('stripe_price_id', $priceId)->first();
            if ($plan && $plan->id !== $local->plan_id) {
                $local->plan_id = $plan->id;
            }
        }

        $local->fill([
            'stripe_subscription_id' => $sub->id,
            'plan_status'            => $sub->status,
            'current_period_ends_at' => $sub->current_period_end
                ? Carbon::createFromTimestamp($sub->current_period_end)
                : null,
            'trial_ends_at' => $sub->trial_end
                ? Carbon::createFromTimestamp($sub->trial_end)
                : null,
            'canceled_at' => $sub->canceled_at
                ? Carbon::createFromTimestamp($sub->canceled_at)
                : null,
        ]);
        $local->save();

        $record->update(['local_id' => $local->id]);
    }

    private function onSubscriptionDeleted(Event $event, SubscriptionEvent $record): void
    {
        $sub = $event->data->object;

        $local = Local::where('stripe_subscription_id', $sub->id)->first();
        if (! $local) return;

        $local->fill([
            'plan_status' => 'canceled',
            'canceled_at' => now(),
            'current_period_ends_at' => $sub->current_period_end
                ? Carbon::createFromTimestamp($sub->current_period_end)
                : $local->current_period_ends_at,
        ])->save();

        $record->update(['local_id' => $local->id]);

        // Email "Cancelaste tu suscripción"
        // (Implementado en Fase 11.8 — si MAIL no está configurado va a log)
        rescue(function () use ($local) {
            \Illuminate\Support\Facades\Mail::to($local->owner?->email ?: $local->email_contacto)
                ->send(new \App\Mail\PlanCanceledMail($local));
        }, report: false);
    }

    private function onTrialWillEnd(Event $event, SubscriptionEvent $record): void
    {
        $sub = $event->data->object;
        $local = Local::where('stripe_subscription_id', $sub->id)->first();
        if (! $local || ! $local->owner) return;

        $record->update(['local_id' => $local->id]);

        rescue(function () use ($local) {
            \Illuminate\Support\Facades\Mail::to($local->owner->email)
                ->send(new \App\Mail\TrialWillEndMail($local));
        }, report: false);
    }

    private function onInvoicePaid(Event $event, SubscriptionEvent $record): void
    {
        $invoice = $event->data->object;
        $subId = $invoice->subscription;
        if (! $subId) return;

        $local = Local::where('stripe_subscription_id', $subId)->first();
        if (! $local) return;

        $local->fill([
            'plan_status' => 'active',
            'current_period_ends_at' => $invoice->lines->data[0]->period->end ?? null
                ? Carbon::createFromTimestamp($invoice->lines->data[0]->period->end)
                : $local->current_period_ends_at,
        ])->save();

        $record->update(['local_id' => $local->id]);

        // F36 — Programa de referidos: si esta es la PRIMERA factura pagada
        // del local y existe un Referral pending donde este local es el
        // referido, recompensamos al referrer con un Stripe Coupon 10% off
        // por 1 mes aplicable a su próxima factura.
        $isFirstPaid = ($invoice->billing_reason ?? '') === 'subscription_create';
        if ($isFirstPaid) {
            rescue(function () use ($local) {
                $this->aplicarRecompensaReferido($local);
            }, report: true);
        }
    }

    /**
     * Crea un Stripe Coupon (10% off, una vez) y lo aplica al customer del
     * referrer para que se descuente en su próxima factura recurrente.
     */
    private function aplicarRecompensaReferido(Local $referido): void
    {
        $referral = \App\Models\Referral::query()
            ->where('referred_local_id', $referido->id)
            ->where('status', 'pending')
            ->first();
        if (! $referral) return;

        $referrer = Local::find($referral->referrer_local_id);
        if (! $referrer || empty($referrer->stripe_customer_id)) {
            $referral->update(['status' => 'invalid']);
            return;
        }
        if (empty(config('stripe.secret_key'))) {
            // Sin Stripe configurado solo marcamos pending → rewarded "manual"
            $referral->update(['status' => 'rewarded', 'rewarded_at' => now()]);
            return;
        }

        try {
            $stripe = app(\App\Services\Billing\StripeClientFactory::class)->make();

            $coupon = $stripe->coupons->create([
                'percent_off'  => 10,
                'duration'     => 'once',
                'name'         => "Referido — {$referido->slug}",
                'metadata'     => [
                    'referrer_local_id' => (string) $referrer->id,
                    'referred_local_id' => (string) $referido->id,
                ],
            ]);

            $stripe->customers->update($referrer->stripe_customer_id, [
                'coupon' => $coupon->id,
            ]);

            $referral->update([
                'status'           => 'rewarded',
                'rewarded_at'      => now(),
                'stripe_coupon_id' => $coupon->id,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning(
                "Referral reward failed for local {$referido->id}: {$e->getMessage()}"
            );
        }
    }

    private function onInvoicePaymentFailed(Event $event, SubscriptionEvent $record): void
    {
        $invoice = $event->data->object;
        $subId = $invoice->subscription;
        if (! $subId) return;

        $local = Local::where('stripe_subscription_id', $subId)->first();
        if (! $local) return;

        $local->fill(['plan_status' => 'past_due'])->save();
        $record->update(['local_id' => $local->id]);

        rescue(function () use ($local) {
            \Illuminate\Support\Facades\Mail::to($local->owner?->email ?: $local->email_contacto)
                ->send(new \App\Mail\PaymentFailedMail($local));
        }, report: false);
    }
}
