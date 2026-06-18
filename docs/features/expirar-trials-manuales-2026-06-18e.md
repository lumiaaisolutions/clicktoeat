# Cierre del ciclo: expira trials manuales — 2026-06-18 (tarde 4)

Audit honesto del flujo trial → expiración → bloqueo, y cierre del hueco.

## Estado del sistema antes de este fix

### Para trial creado vía Stripe checkout normal — ya funcionaba

```
Owner se registra → Stripe checkout (trial 14 días) → trial_ends_at se setea
  ↓ TrialNudgeDispatcher (cron diario 10am)
  ├── Día 3   → email "Cómo va tu local"
  ├── Día 7   → email "Aprovecha estas features"
  ├── Día 14  → email "Tu trial casi termina"
  └── trial_ends_at - 1 día → email "Última oportunidad, agrega tarjeta hoy"
  ↓ trial_ends_at vence
Stripe webhook customer.subscription.updated llega con status=incomplete o past_due
  ↓ WebhookHandler::onSubscriptionUpsert lo persiste
  ↓ Frontend /auth/me devuelve is_active=false
PlanInactiveScreen renderiza encima de todo el panel → owner no puede usar nada
hasta agregar tarjeta vía /admin/billing
```

✅ Todo automático, sin hardcode.

### Para trial **manual** (super_admin marca "En prueba") — había un hueco

```
Super admin marca plan_status=trialing desde /admin/locales/{id} modal billing
  ↓ updateBilling auto-setea trial_ends_at=+14d (fix anterior)
  ↓ TrialNudgeDispatcher manda emails día 3/7/14/ending igual que Stripe
  ✅ banner countdown se actualiza día a día
  ↓ trial_ends_at vence
  ❌ NADIE cambia plan_status — no hay Stripe, no hay webhook
  ❌ Local sigue eternamente "trialing" → hasActivePlan()=true
  ❌ Owner usa el sistema sin pagar nunca
```

## Fix: nuevo cron `trials:expire-manual`

`apps/api/app/Console/Commands/ExpireManualTrialsCommand.php`:

```php
$locales = Local::query()
    ->withoutGlobalScopes()
    ->where('plan_status', 'trialing')
    ->where('trial_ends_at', '<', now())
    ->whereNull('stripe_subscription_id')
    ->where(fn ($q) => $q->where('pago_externo', false)->orWhereNull('pago_externo'))
    ->get();

foreach ($locales as $local) {
    $local->forceFill(['plan_status' => 'incomplete'])->save();
    Log::info('Trial manual expirado', [...]);
}
```

**Qué garantiza**:

- Solo afecta locales **sin** `stripe_subscription_id` → no pisa decisiones del webhook
- Solo afecta locales **sin** `pago_externo` → los que pagan al super_admin en efectivo siguen activos sin importar la fecha
- Idempotente: locales ya `incomplete` no se vuelven a tocar
- Logea cada acción para auditoría posterior

### Scheduler

`apps/api/bootstrap/app.php`:

```php
$schedule->command('trials:expire-manual')
    ->daily()->at('10:30')->name('expire-manual-trials')->onOneServer();
```

Corre 30 min después de `trial-nudge-emails` (10:00) — primero se manda el email de "tu trial casi termina" y al día siguiente, si no agregó tarjeta, se bloquea.

## Resultado: cierre completo del ciclo

```
Super admin marca "En prueba"
  ↓ trial_ends_at = +14d (auto)
  ↓ Día N+3, +7, +14, +13 → emails automáticos
  ↓ Día N+14 (vencimiento)
  ↓ Día N+15 10:30 am → trials:expire-manual lo pasa a incomplete
  ↓ Owner entra al panel → /auth/me devuelve is_active=false
PlanInactiveScreen bloquea TODO el admin (excepto /billing y /perfil para que
pueda agregar tarjeta o cerrar sesión)
  ↓ Owner pulsa "Agregar tarjeta y activar"
  ↓ /billing/activate-existing → Stripe Checkout con client_reference_id
  ↓ Stripe webhook → local actualizado a active
  ↓ Bloqueo desaparece, owner sigue trabajando
```

## Test coverage

`tests/Feature/Billing/ExpireManualTrialsTest.php` — 5 escenarios:

| Test | Estado inicial | Esperado |
|---|---|---|
| `test_trial_manual_vencido_pasa_a_incomplete` | trialing + vencido + sin sub | incomplete |
| `test_trial_vigente_no_se_toca` | trialing + +5 días + sin sub | trialing |
| `test_trial_con_subscription_stripe_lo_maneja_el_webhook` | trialing + vencido + CON sub | trialing (no tocamos) |
| `test_pago_externo_nunca_se_expira` | trialing + vencido + pago_externo=true | trialing |
| `test_local_ya_incomplete_no_se_toca_de_nuevo` | incomplete + vencido | incomplete (idempotente) |

**Resultado: 5/5 verde + suite completa 194/194 verde**.

## Configurar el cron en hPanel (acción del owner)

El comando ya queda registrado en el scheduler. El cron de hPanel ya
ejecuta `php artisan schedule:run` cada minuto (configurado en sesiones
previas) — así que **NO hay que hacer nada manual**. El comando empezará
a correr automáticamente desde mañana 10:30 am.

Para verificar manualmente cuando quieras:

```bash
ssh u221820910@86.38.202.72 -p 65002
cd domains/clicktoeat-api.lumiaaisolutions.com/public_html
php artisan trials:expire-manual
# Output: "Expiraron N trials manuales."
```

## Archivos tocados

```
apps/api/app/Console/Commands/ExpireManualTrialsCommand.php   # nuevo
apps/api/bootstrap/app.php                                     # +scheduler entry
apps/api/tests/Feature/Billing/ExpireManualTrialsTest.php     # nuevo (5 tests)
```

## Verificación

- ✅ 194/194 phpunit verde (189 + 5 nuevos)
- ✅ El comando se ejecuta diario 10:30 am vía cron hPanel ya configurado
- ✅ Idempotente — correr 10 veces el mismo día tiene mismo efecto que correr 1 vez
