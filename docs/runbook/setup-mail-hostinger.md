# Runbook — Configurar `MAIL_*` con Hostinger Email

> Sin esto, el reset de contraseña por email (Fase 7b) no envía nada — sólo escribe el email al log. Para producción real necesitamos un mailer funcional.

## Opción recomendada: Hostinger Email (incluido en Business)

Hostinger Business **incluye buzones de email gratis** con el dominio. No requiere proveedor externo.

### 1. Crear el buzón en hPanel

1. https://hpanel.hostinger.com → **Email** → **Email Accounts**.
2. **Create New Account**:
   - Email: `noreply@clicktoeat.lumiaaisolutions.com`
   - Password: generar uno fuerte (mínimo 16 chars) — **guardar en password manager** (1Password / Doppler).
   - Disk space: 100 MB es suficiente (los emails enviados no se guardan acá, sólo los de respuesta si los hay).
3. **Create**.

### 2. Obtener credenciales SMTP

hPanel muestra los datos al crear el buzón. Default Hostinger:

| Campo | Valor |
|-------|-------|
| SMTP server | `smtp.hostinger.com` |
| SMTP port | `465` (SSL) o `587` (TLS) |
| Username | `noreply@clicktoeat.lumiaaisolutions.com` |
| Password | el que pusiste arriba |
| Encryption | `SSL` (en :465) o `TLS` (en :587) |

### 3. Configurar `.env` productivo

SSH al servidor:

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html

# Editar el .env (vim, nano, o lo que prefieras)
nano .env
```

Agregar / actualizar estas variables:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=noreply@clicktoeat.lumiaaisolutions.com
MAIL_PASSWORD="<el password generado>"
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="noreply@clicktoeat.lumiaaisolutions.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### 4. Limpiar config cache

```bash
php artisan config:clear
php artisan config:cache
```

### 5. Test

```bash
php artisan tinker
>>> use App\Models\User;
>>> use App\Notifications\ResetPasswordNotification;
>>> User::where('email', 'owner+tacos-el-gordo@ClickToEat.app')->first()
       ->notify(new ResetPasswordNotification('test-token-123'));
>>> exit
```

Debe llegar un email a la dirección del owner en < 30 segundos. Si tarda más de 2 min, revisar:
- `storage/logs/laravel.log` — buscar errores SMTP
- Webmail de `noreply@...` → carpeta "Sent" — confirmar que salió
- Spam folder del destinatario

### 6. Verificar el flujo de reset

```bash
curl -X POST https://clicktoeat-api.lumiaaisolutions.com/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"owner+tacos-el-gordo@ClickToEat.app"}'
```

Email llega con link `https://clicktoeat.lumiaaisolutions.com/reset-password?token=<...>&email=<...>`.

## DNS — deliverability (CRÍTICO)

Sin estos registros, los emails caen en spam o se rechazan directamente.

### SPF

En el DNS de `lumiaaisolutions.com` (Cloudflare / Hostinger DNS):

```
Type:  TXT
Name:  @  (o "lumiaaisolutions.com")
Value: v=spf1 include:_spf.hostinger.com ~all
TTL:   3600
```

### DKIM

Hostinger genera la clave DKIM automáticamente al crear el buzón:

1. hPanel → Email → tu cuenta → **DKIM Configuration**.
2. Te da un registro TXT del tipo:
   ```
   Type:  TXT
   Name:  hostingermail._domainkey
   Value: v=DKIM1; k=rsa; p=MIIB...largo...QAB
   ```
3. Agregarlo en el DNS.

### DMARC

```
Type:  TXT
Name:  _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@lumiaaisolutions.com; pct=100
TTL:   3600
```

`p=quarantine` (recomendado inicialmente) → emails que fallan SPF/DKIM van a spam.
`p=reject` (más estricto, después de validar que todo funciona) → se rechazan.

### Verificar DNS propagado

```bash
dig txt lumiaaisolutions.com +short | grep spf
dig txt hostingermail._domainkey.lumiaaisolutions.com +short
dig txt _dmarc.lumiaaisolutions.com +short
```

O usar https://mxtoolbox.com → SuperTool → introducir `lumiaaisolutions.com`.

## Test de deliverability

Usar https://www.mail-tester.com:

1. Te da un email único: `test-XXXXX@srv1.mail-tester.com`
2. Tinker:
   ```php
   Mail::raw('test', fn($m) => $m->to('test-XXXXX@srv1.mail-tester.com')->subject('Test'));
   ```
3. En el sitio, click "Then check your score" → debe dar **>= 8/10**.

Si da < 8: típicamente faltan SPF/DKIM/DMARC, o el `From` no coincide con el dominio del MAIL_USERNAME.

## Alternativas si Hostinger Email no alcanza

| Provider | Pros | Contras | Cuándo |
|---------|------|---------|--------|
| **Hostinger Email** (actual) | Gratis, sin setup adicional | Volumen limitado (~100/día por buzón típicamente) | MVP, bajo volumen |
| **Resend** | API moderna, deliverability excelente | Paga después de 3k emails/mes ($20/mes hasta 50k) | Cuando necesites templates ricos / analytics |
| **AWS SES** | Más barato a alto volumen ($0.10 por 1000 emails) | Requiere validación de dominio, cuenta AWS | > 100k emails/mes |
| **Mailgun** | API + dashboard maduro | $35/mes mínimo | Necesidad de tracking detallado |

Mientras estés en MVP, Hostinger Email basta.

## Volumen esperado de ClickToEat (estimación)

- Reset password: ~10/mes por local activo (la gente olvida).
- Verificación email (cuando se introduzca): ~1 por signup nuevo.
- Notificaciones a owner (cuando se introduzcan): variable.

Con 10 locales activos → ~100 emails/mes. Hostinger sobra.

## Cuándo migrar a Resend / SES

Indicadores:
- Más de 1k emails/mes.
- Necesitas analytics (open rate, click rate).
- Necesitas templates HTML ricos con A/B testing.
- Te interesa enviar campañas (no transaccional puro).

Cuando llegue ese punto: nuevo runbook + ADR. Hoy: Hostinger.

## Email transaccional vs marketing

ClickToEat sólo envía **transaccional** (reset password, confirmaciones de pedido eventualmente). No mandar nada de marketing por el mismo dominio — afecta la reputación.

Si en el futuro hay marketing: subdominio separado `mail.clicktoeat.lumiaaisolutions.com` con SPF/DKIM propios.

## Checklist post-config

- [ ] Buzón creado en hPanel.
- [ ] Password fuerte guardado en password manager.
- [ ] `MAIL_*` en `.env` productivo.
- [ ] `config:cache` corrido.
- [ ] Test desde Tinker con un email real → recibido.
- [ ] Test del endpoint `/auth/forgot-password` desde curl → email recibido.
- [ ] SPF en DNS.
- [ ] DKIM en DNS.
- [ ] DMARC en DNS.
- [ ] mail-tester.com score >= 8/10.
- [ ] Actualizar `docs/issues/devops-faltante.md` y `funcionalidad-faltante.md` marcando reset email como ✅ funcional en prod.
