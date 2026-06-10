# Runbook — Rotar `APP_KEY`

## Cuándo

- La key actual quedó expuesta (commit accidental, leak en logs, salida del equipo de un dev con acceso).
- Política de rotación periódica.
- Onboarding de un nuevo entorno (cada entorno tiene su propia key).

## Qué hace `APP_KEY`

Laravel la usa para:
- **Cifrado simétrico** (`Crypt::encrypt`, `encrypted` casts).
- **Firma de cookies** (CSRF, session).
- **Firma de signed URLs**.

⚠️ **NO** afecta:
- Bcrypt de contraseñas (es independiente).
- Tokens Sanctum en `personal_access_tokens` (son SHA-256 hash del plaintext, sin cifrado por APP_KEY).

## Lo que se rompe al rotar

- Cualquier valor cifrado en BD con la key vieja → ilegible. Hoy en ClickToEat **no hay** `encrypted` casts ni columnas cifradas, así que esto NO es un problema.
- Sesiones activas en `sessions` con cookies firmadas con la key vieja → los usuarios deben volver a loguear desde web.
- Cookies CSRF emitidas con la vieja → siguiente request invalida y se reemite (transparente).

**Tokens Sanctum siguen funcionando** porque no usan APP_KEY.

## Pasos

### Local / Docker dev

```bash
# 1. Backup del valor actual por si hay que revertir
grep APP_KEY apps/api/.env

# 2. Genera key nueva (in-place en .env)
docker compose exec api php artisan key:generate
# o nativo:
cd apps/api && php artisan key:generate

# 3. Reinicia php-fpm para asegurar lectura de la nueva key
docker compose restart api
```

### Producción

⚠️ Pre-requisito: confirmar que ningún `encrypted` cast / dato cifrado en BD necesita la key vieja. Si lo hubiera, primero migrar con `APP_PREVIOUS_KEYS` (ver más abajo).

```bash
# 1. Comparte la key nueva al equipo via secret manager (1Password / Doppler / Vault)
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"

# 2. Actualiza la variable en el deploy (env vars del runner / .env del servidor)

# 3. Deploy / restart de la aplicación
# (depende del proveedor: docker compose restart, kubectl rollout, fly deploy, etc.)

# 4. Limpia config cache si la app lo usa
php artisan config:clear
php artisan config:cache
```

## Migración con datos cifrados (sólo si aplicara en el futuro)

Si en algún momento se introduce `encrypted` cast en alguna columna:

1. Antes de rotar, agregar la key vieja a `APP_PREVIOUS_KEYS` (`.env`):
   ```env
   APP_KEY=base64:<NUEVA>
   APP_PREVIOUS_KEYS=base64:<VIEJA>
   ```
   Laravel usa la nueva para cifrar nuevo y la vieja como fallback para descifrar viejo.

2. Correr un comando que re-cifre todos los registros con la nueva:
   ```bash
   php artisan tinker
   >>> Modelo::chunk(100, fn($c) => $c->each->save());
   ```

3. Eliminar `APP_PREVIOUS_KEYS`.

## Verificación post-rotación

```bash
# 1. Login responde 200 con un user
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner+tacos-el-gordo@ClickToEat.app","password":"password123"}' | jq

# 2. Tokens viejos siguen funcionando (Sanctum no usa APP_KEY)
curl -s http://localhost:8080/api/v1/auth/me -H "Authorization: Bearer <token-viejo>" | jq
```

## Política recomendada para ClickToEat

- **Dev**: cada dev tiene su key local, generada al hacer `php artisan key:generate` la primera vez. `.env` está en `.gitignore`. **No** compartir.
- **Prod**: key única generada en el primer deploy, almacenada en el secret manager del proveedor. Rotar **al menos una vez al año** o ante incidente.

## Estado actual de la key del repo

Al 2026-06-10:
- `apps/api/.env.example` → `APP_KEY=` (vacío, correcto).
- `apps/api/.env` → contiene una key real. **Está en `.gitignore`**, así que no se versiona en el repo, pero **vive en disco local del dev**. Cuando este proyecto pase a un repo Git real, hay que verificar que el `.env` no esté ya trackeado (`git ls-files | grep .env` debe devolver vacío).
- Producción → la key está fuera del repo (debería estar en el secret manager del proveedor, no documentada aquí).

## Cosas a NO hacer

- ❌ Rotar la key sin avisar al equipo (todas las sesiones web se cierran).
- ❌ Commitear la nueva key.
- ❌ Compartirla por chat sin cifrar.
- ❌ Rotar en producción sin haber hecho backup de la BD.
