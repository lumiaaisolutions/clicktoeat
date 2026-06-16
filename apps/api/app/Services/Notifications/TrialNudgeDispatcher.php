<?php

namespace App\Services\Notifications;

use App\Mail\TrialNudgeMail;
use App\Models\Local;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * Despacha los emails de onboarding durante el trial. Corre 1x al día desde
 * el scheduler. Idempotente: usa la tabla local_email_log (unique local_id+tipo).
 *
 * Reglas:
 *   - trial_d3  → exactamente 3 días desde created_at, sólo si plan_status = trialing.
 *   - trial_d7  → exactamente 7 días.
 *   - trial_d14 → exactamente 14 días o si el trial expiró ayer sin convertir.
 *   - trial_ending → si trial_ends_at - 1 día = hoy y aún no convirtieron.
 *
 * Sólo se manda si:
 *   - Hay un owner asociado con email válido.
 *   - El local no ha pagado (pago_externo=false, plan_status!=active).
 *   - No se ha enviado antes (verificado por log).
 *
 * Falla silenciosamente por local — no rompe el batch entero si un email falla.
 */
class TrialNudgeDispatcher
{
    public static function dispatchPending(): int
    {
        $hoy = now()->startOfDay();
        $sent = 0;

        $locales = Local::query()
            ->withoutGlobalScopes()
            ->where('plan_status', 'trialing')
            ->where(fn ($q) => $q->where('pago_externo', false)->orWhereNull('pago_externo'))
            ->whereNotNull('owner_id')
            ->get();

        foreach ($locales as $local) {
            $daysSinceCreated = (int) $local->created_at?->startOfDay()->diffInDays($hoy);

            $tipo = null;
            if     ($daysSinceCreated === 3)  $tipo = 'trial_d3';
            elseif ($daysSinceCreated === 7)  $tipo = 'trial_d7';
            elseif ($daysSinceCreated === 14) $tipo = 'trial_d14';

            // 1 día antes de fin de trial
            if (! $tipo && $local->trial_ends_at) {
                $daysToEnd = (int) $hoy->diffInDays($local->trial_ends_at->startOfDay(), false);
                if ($daysToEnd === 1) $tipo = 'trial_ending';
            }

            if (! $tipo) continue;

            // Idempotencia
            $yaEnviado = DB::table('local_email_log')
                ->where('local_id', $local->id)
                ->where('tipo', $tipo)
                ->exists();
            if ($yaEnviado) continue;

            $owner = User::find($local->owner_id);
            if (! $owner?->email) continue;

            try {
                Mail::to($owner->email)->send(new TrialNudgeMail($local, $tipo));
                DB::table('local_email_log')->insert([
                    'local_id' => $local->id,
                    'tipo'     => $tipo,
                    'sent_at'  => now(),
                ]);
                $sent++;
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $sent;
    }
}
