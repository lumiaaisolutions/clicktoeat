# Feature — Reset de contraseña por email

## Endpoints

| Método | Ruta                          | Throttle | Auth |
|-------|-------------------------------|----------|------|
| POST  | `/auth/forgot-password`       | 5/min   | No   |
| POST  | `/auth/reset-password`        | 5/min   | No   |

## Flujo

```
1. Cliente            → POST /auth/forgot-password { email }
   API                → Password::sendResetLink()
                          ├── Genera token, lo guarda hasheado en `password_reset_tokens`
                          └── Envía ResetPasswordNotification al user (driver MAIL_MAILER)
   API                → 200 (mensaje genérico — no revela si email existe)

2. Cliente recibe email con link:
   https://clicktoeat.lumiaaisolutions.com/reset-password?token=<token>&email=<email>

3. Cliente abre el link en el frontend
   Frontend           → POST /auth/reset-password { token, email, password, password_confirmation }
   API                → Password::reset()
                          ├── Valida token contra password_reset_tokens
                          ├── Hashea password nueva
                          └── Borra TODOS los tokens Sanctum del user (todas las sesiones)
   API                → 200 "Contraseña restablecida. Inicia sesión."
```

## Mensajes y seguridad

- **No revela existencia de email**: el endpoint `/forgot-password` responde el mismo mensaje sea que el email exista o no. Evita user enumeration.
- **Token expira en 60 min** (default Laravel — `config/auth.php`).
- **Throttle nativo de Laravel**: `Password::sendResetLink` ya tiene throttle de 60s por user.
- **Throttle adicional de ruta**: 5/min por IP.
- **Token en BD está hasheado** — la BD comprometida no expone tokens en claro.
- **Reset cierra TODAS las sesiones del user** (Sanctum tokens borrados). User debe re-loguear en todos sus dispositivos.

## URL del link

Construida en `ResetPasswordNotification::toMail`:
```
{FRONTEND_URL}/reset-password?token=<token>&email=<email-urlencoded>
```

El frontend debe tener una página `/reset-password` que:
1. Lea `token` y `email` del query string.
2. Pida nueva password + confirmación.
3. Llame `POST /auth/reset-password`.

## Configuración de `MAIL_*` (producción)

Hoy `apps/api/.env.example` tiene driver `log` por default — los emails se escriben a `storage/logs/laravel.log` (útil para dev y test).

Para producción real, configurar uno de los siguientes drivers en el `.env`:

### Resend (recomendado para volúmenes pequeños/medianos)

```env
MAIL_MAILER=resend
MAIL_FROM_ADDRESS=noreply@clicktoeat.lumiaaisolutions.com
MAIL_FROM_NAME="${APP_NAME}"
RESEND_API_KEY=<obtener de resend.com>
```

Requiere `composer require resend/resend-laravel`.

### AWS SES

```env
MAIL_MAILER=ses
MAIL_FROM_ADDRESS=noreply@clicktoeat.lumiaaisolutions.com
MAIL_FROM_NAME="${APP_NAME}"
AWS_ACCESS_KEY_ID=<...>
AWS_SECRET_ACCESS_KEY=<...>
AWS_DEFAULT_REGION=us-east-1
```

Requiere `composer require aws/aws-sdk-php`.

### SMTP genérico (Mailgun, Postmark, etc.)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=<smtp user>
MAIL_PASSWORD=<smtp pass>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@clicktoeat.lumiaaisolutions.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Hostinger Email (incluido en plan Business)

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=noreply@clicktoeat.lumiaaisolutions.com
MAIL_PASSWORD=<setearlo desde hPanel>
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=noreply@clicktoeat.lumiaaisolutions.com
MAIL_FROM_NAME="${APP_NAME}"
```

Sin paquete adicional.

## DNS / deliverability

Para que los emails no caigan en spam, configurar en el DNS del dominio `lumiaaisolutions.com`:

- **SPF**: `v=spf1 include:_spf.<provider>.com ~all`
- **DKIM**: clave provista por el provider (Resend, SES, Mailgun, etc.)
- **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@lumiaaisolutions.com`

Sin estos registros, hay buena chance de que los emails caigan en spam o se rechacen directo.

## Frontend (pendiente implementar)

El panel admin necesita:

1. **Botón "¿Olvidaste tu contraseña?"** en `/login` → form con email → `POST /auth/forgot-password` → toast "Si el email existe, recibirás un enlace".
2. **Página `/reset-password`** que lea query params → form de nueva password → `POST /auth/reset-password` → redirige a `/login`.

Cuando se implemente el frontend, agregar el flujo a [`docs/user-guides/primeros-pasos.md`](../user-guides/primeros-pasos.md).

## Tests

`tests/Feature/Auth/PasswordResetTest.php` cubre:
- Forgot envía email si existe.
- Forgot NO revela si email no existe.
- Forgot valida formato de email.
- Reset con token válido cambia password.
- Reset invalida todas las sesiones.
- Reset con token inválido → 422.
- Reset con email inexistente → 422.
- Reset con password mismatch → 422.
