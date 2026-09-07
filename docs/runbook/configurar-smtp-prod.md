# Runbook — Arreglar el envío de correo (SMTP) en producción

> Aplica a **ClickToEat y ClickToShop** (mismo VPS, mismo buzón Hostinger).
> Estado a 2026-09-07: ambos con `MAIL_MAILER=log` → **no se envía ningún
> correo** (reset de password, notificaciones, newsletter). Causa raíz: el
> password del buzón SMTP ya no autentica (error **535 auth failed**).

## Por qué está en `log`

Se dejó `MAIL_MAILER=log` como fallback seguro para que la app no reviente al
intentar enviar. Los correos se escriben a `storage/logs/laravel.log` en vez de
mandarse. Es una tirita, no la solución.

## Config actual en el servidor (`/var/www/<sitio>/api/.env`)

```
MAIL_MAILER=log                 ← hay que volver a smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=fernando@lumiaaisolutions.com
MAIL_PASSWORD=****               ← inválido (535)
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="contacto@lumiaaisolutions.com"
MAIL_FROM_NAME="ClickToEat" | "ClickToShop"
```

⚠️ **Desajuste a corregir**: se autentica como `fernando@` pero se envía como
`contacto@`. Hostinger suele exigir que el `FROM` sea el **mismo buzón** con el
que te autenticas (o un alias autorizado). Recomendación: usar **un solo
buzón** para auth y FROM. Elige uno:
- **Opción A (recomendada):** usar `contacto@lumiaaisolutions.com` para ambos
  (es el remitente de marca). → `MAIL_USERNAME=contacto@lumiaaisolutions.com`.
- **Opción B:** usar `fernando@lumiaaisolutions.com` para ambos.
  → `MAIL_FROM_ADDRESS="fernando@lumiaaisolutions.com"`.

## Pasos (los hace el dueño — requiere el password del buzón)

1. **Resetear/confirmar el password** del buzón elegido en el panel de correo
   de Hostinger (hPanel → Emails → Cuentas → *Cambiar contraseña*).
2. **Entrar al VPS y editar el `.env` de cada sitio:**
   ```bash
   ssh -p 8080 deploy@2.24.123.93
   # ClickToEat
   nano /var/www/clicktoeat/api/.env
   #   MAIL_MAILER=smtp
   #   MAIL_USERNAME=<buzón elegido>
   #   MAIL_PASSWORD=<password nuevo>
   #   MAIL_FROM_ADDRESS="<buzón elegido>"   (si usas Opción A/B para alinear)
   # ClickToShop (mismo cambio)
   nano /var/www/clicktoshop/api/.env
   ```
3. **Refrescar config cacheada** en cada sitio:
   ```bash
   cd /var/www/clicktoeat/api  && php artisan config:cache
   cd /var/www/clicktoshop/api && php artisan config:cache
   ```
4. **Probar el envío** (cambia el destinatario por uno tuyo):
   ```bash
   cd /var/www/clicktoeat/api && php artisan tinker --execute="Mail::raw('Test ClickToEat SMTP OK', function(\$m){ \$m->to('TU-CORREO@gmail.com')->subject('Test SMTP'); }); echo 'enviado';"
   ```
   - Si llega el correo → listo, repetir el mismo test en `clicktoshop`.
   - Si sale **535** otra vez → el password sigue mal (revisar buzón/typo).
   - Si sale error de FROM/relay → el `FROM` no coincide con el buzón autenticado
     (aplica el ajuste de la Opción A/B).

## Rollback

Si algo falla y urge que la app no intente enviar, volver a `MAIL_MAILER=log`
+ `php artisan config:cache`.

## Nota para Claude / dev

No puedo resetear el password del buzón ni escribir el secreto en el `.env`
(es una credencial). Una vez que el dueño confirme que el password ya funciona,
sí puedo hacer el flip `MAIL_MAILER=smtp` + `config:cache` + el test de envío.
