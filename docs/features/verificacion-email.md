# Verificación de correo (doble opt-in)

> Confirmación de correo **suave** (no bloqueante): al registrarse, el usuario
> recibe un correo con un enlace firmado. Mientras no lo confirme, el panel
> muestra un aviso amable pero **toda la operación sigue funcionando**. No es un
> gate duro — es para asegurar avisos (recuperación de contraseña, notificaciones)
> y reducir cuentas con correos tipográficamente erróneos.

## Por qué "suave" y no bloqueante

El onboarding de ClickToEat ya es largo (registro → plan → alta de local →
catálogo). Bloquear al usuario en "confirma tu correo antes de continuar" mata
la conversión. En su lugar:

- El registro crea la cuenta y **entrega el token** igual que siempre.
- En paralelo se **encola** (no bloquea la respuesta) el correo de verificación.
- El panel muestra un banner ámbar `Confirma tu correo` con botón **Reenviar**,
  visible solo mientras `email_verified_at` sea `null`. El usuario puede ocultarlo.

## Flujo

```
register  ──►  User::create  ──►  sendEmailVerificationNotification()  (encolado)
                                          │
                                          ▼
                        correo con URL firmada (60 min)
                                          │
              usuario hace clic ──────────┘
                                          ▼
   GET /api/v1/auth/email/verify/{id}/{hash}   (middleware: signed + throttle:6,1)
                                          │
                 firma válida + hash del correo coincide
                                          │
                             markEmailAsVerified()
                                          ▼
        redirect →  {FRONTEND_URL}/correo-verificado?ok=1   (o ?ok=0 si inválido)
```

## Piezas

### Backend

| Archivo | Rol |
|---|---|
| `app/Models/User.php` | `implements MustVerifyEmail` + `sendEmailVerificationNotification()` que usa nuestra notificación con diseño ClickToEat (no la default de Laravel). |
| `app/Notifications/VerifyEmailNotification.php` | `ShouldQueue`. Genera la URL con `URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id','hash'])` y renderiza `mail.verify_email`. |
| `resources/views/mail/verify_email.blade.php` | `@extends('mail.layout')` — mismo header splash + logo que el resto de correos. Botón "Confirmar mi correo". |
| `app/Http/Controllers/Api/EmailVerificationController.php` | `verify()` (público, autenticado por la firma) y `resend()` (autenticado con `auth:sanctum`). |
| `app/Http/Controllers/Api/AuthController.php` | `register()` dispara `sendEmailVerificationNotification()` tras crear el usuario. |

### Rutas (`routes/api.php`, prefijo `auth`)

```php
Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
Route::post('email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth:sanctum', 'throttle:5,1']);
```

- `verify` **no** lleva `auth:sanctum`: el usuario llega desde su bandeja sin
  sesión. La autenticación es la **firma de la URL** (`signed`) + que el `sha1`
  del correo actual coincida con el `hash` de la URL. Si el usuario cambió su
  correo, los enlaces viejos dejan de servir automáticamente.
- `resend` sí es autenticada — es el botón "Reenviar" del panel.

### Frontend

| Archivo | Rol |
|---|---|
| `app/correo-verificado/page.tsx` | Página pública de aterrizaje. Lee `?ok=1\|0` y muestra éxito (verde) o enlace inválido/expirado (ámbar) con CTA a `/admin`. `useSearchParams` va dentro de `<Suspense>` (requisito de build en Next 14). |
| `components/EmailVerificationBanner.tsx` | Banner ámbar montado en `app/admin/layout.tsx`. Se muestra solo si `user && !user.email_verified_at`. Botón "Reenviar" → `POST /auth/email/verification-notification`; ocultable. |
| `store/auth.ts` | `AuthUser` incluye `email_verified_at?: string \| null`. Viene de `/auth/me` (que expone `user.toArray()`). |

## Encolado (importante en prod)

La notificación es `ShouldQueue` con `QUEUE_CONNECTION=database`. En el VPS **no
hay worker persistente** (recurso compartido con otros productos LUMIA). El
scheduler drena la cola cada minuto:

```php
// bootstrap/app.php → withSchedule
$schedule->command('queue:work --stop-when-empty --max-time=55 --tries=3 --quiet')
    ->everyMinute()->name('drain-queue')->withoutOverlapping()->onOneServer();
```

Consecuencia: el correo de verificación puede tardar **hasta ~1 min** en salir.
Es aceptable para un opt-in suave. Ver [`correos-sistema-unificado.md`](correos-sistema-unificado.md)
para el resto del sistema de correo.

## Notas de seguridad

- La firma expira a los **60 minutos**; enlaces vencidos redirigen a `?ok=0`.
- `throttle:6,1` en `verify` y `throttle:5,1` en `resend` evitan abuso.
- El `hash` es `sha1(email)`, no un secreto — la protección real es la firma HMAC
  de Laravel sobre la URL completa (depende de `APP_KEY`).
- `markEmailAsVerified()` es idempotente: reusar un enlace válido no rompe nada.

## Pendiente / posible mejora

- Hoy la verificación **no** habilita ni deshabilita ninguna función. Si en el
  futuro se quiere exigir correo verificado para acciones sensibles (ej. exportar
  datos, invitar staff), agregar el middleware `verified` a esas rutas puntuales
  — nunca al onboarding completo.
- Paridad ClickToShop: replicar este mismo flujo (ver regla de paridad en CLAUDE.md).
