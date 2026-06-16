# Configurar Mail / Stripe / VAPID / Sentry en producción

Lista de variables `.env` que faltan o pueden faltar en el VPS, cómo
verificarlas, y cómo setearlas sin necesidad de redeploy.

## 1. Verificar qué falta

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 \
  "grep -E '^(MAIL_USERNAME|MAIL_PASSWORD|MAIL_FROM_ADDRESS|STRIPE_WEBHOOK_SECRET|STRIPE_SECRET_KEY|STRIPE_PRICE_ESSENTIAL|STRIPE_PRICE_PROFESSIONAL|STRIPE_PRICE_PREMIUM|VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|VAPID_SUBJECT|SENTRY_LARAVEL_DSN)=' \
   ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.env \
   | sed 's/=.*/=SET/'"
```

Esperado: 12 líneas. Cualquiera que falte bloquea esa feature.

**Nota zsh**: los paréntesis y `|` van escapados dentro de comillas
simples — usa el comando exactamente como aparece arriba.

## 2. Setear una variable individual

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 \
  "cd ~/domains/clicktoeat-api.lumiaaisolutions.com/public_html && \
   echo 'MAIL_PASSWORD=tu_password_aqui' >> .env && \
   php artisan config:clear"
```

⚠️ Si la variable ya existe, no agregues una segunda — edita la línea
existente con `sed` o entra al `.env` con `nano`.

## 3. Variables críticas por feature

### Mail (newsletter, tickets, password reset, pedido confirmado)

| Var                  | Valor típico                                  |
|----------------------|-----------------------------------------------|
| `MAIL_MAILER`        | `smtp`                                        |
| `MAIL_HOST`          | `smtp.hostinger.com`                          |
| `MAIL_PORT`          | `465`                                         |
| `MAIL_USERNAME`      | `soporte@lumiaaisolutions.com`                |
| `MAIL_PASSWORD`      | la del buzón Hostinger                        |
| `MAIL_ENCRYPTION`    | `ssl`                                         |
| `MAIL_FROM_ADDRESS`  | `soporte@lumiaaisolutions.com`                |
| `MAIL_FROM_NAME`     | `ClickToEat`                                  |

**Test post-setup**:

```bash
ssh ... 'cd ~/...public_html && php artisan tinker --execute="\Mail::raw(\"test\", function (\$m) { \$m->to(\"tu_correo@gmail.com\")->subject(\"Test\"); });"'
```

### Stripe (pagos LIVE — actualmente en TEST)

| Var                          | De dónde sale                                                       |
|------------------------------|---------------------------------------------------------------------|
| `STRIPE_PUBLIC_KEY`          | dashboard.stripe.com → Developers → API keys → Live publishable key |
| `STRIPE_SECRET_KEY`          | Live secret key (`sk_live_...`)                                     |
| `STRIPE_WEBHOOK_SECRET`      | Developers → Webhooks → \[tu endpoint\] → Signing secret            |
| `STRIPE_PRICE_ESSENTIAL`     | Products → Essential → Pricing → price_id (`price_...`)             |
| `STRIPE_PRICE_PROFESSIONAL`  | Idem para Professional                                              |
| `STRIPE_PRICE_PREMIUM`       | Idem para Premium (si existe)                                       |

**Webhook endpoint URL** (tienes que agregarlo en Stripe Dashboard):

```
https://clicktoeat-api.lumiaaisolutions.com/api/v1/billing/webhook
```

Eventos a escuchar:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Tras crear el webhook, copia el **Signing secret** y mételo como
`STRIPE_WEBHOOK_SECRET`.

### VAPID (push notifications PWA)

Si no están seteados, generar con:

```bash
ssh ... 'cd ~/...public_html && php artisan tinker --execute="
\$g = (new \Minishlink\WebPush\VAPID())->createVapidKeys();
echo \"VAPID_PUBLIC_KEY=\".\$g[\"publicKey\"].\"\\n\";
echo \"VAPID_PRIVATE_KEY=\".\$g[\"privateKey\"].\"\\n\";
"'
```

Pegar la salida en `.env` + agregar:

```
VAPID_SUBJECT=mailto:soporte@lumiaaisolutions.com
```

Y exponer la pública al frontend en `apps/web/.env`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<la misma pública>
```

Redeploy del web tras cambiar `.env` de frontend.

### Sentry (error tracking opcional)

| Var                    | Valor                                                  |
|------------------------|--------------------------------------------------------|
| `SENTRY_LARAVEL_DSN`   | `https://xxx@xxx.ingest.sentry.io/yyy` (del project)  |
| `SENTRY_TRACES_SAMPLE` | `0.1` (10% de transactions, ajustable)                 |

Y para que el script de deploy etiquete releases:

```bash
# En tu máquina local
export SENTRY_AUTH_TOKEN=sntrys_xxx
export SENTRY_ORG=lumiaaisolutions
export SENTRY_PROJECT=clicktoeat-api
brew install getsentry/tools/sentry-cli
```

## 4. Después de cualquier cambio en `.env`

```bash
ssh ... 'cd ~/...public_html && php artisan config:clear && php artisan config:cache'
```

No necesitas redeploy completo — sólo refrescar caches.

## 5. Verificar que el cambio surtió efecto

```bash
ssh ... 'cd ~/...public_html && php artisan tinker --execute="echo config(\"mail.mailers.smtp.username\");"'
```
