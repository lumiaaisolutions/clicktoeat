#!/usr/bin/env bash
#
# ClickToEat — Deploy de la API (Laravel) a Hostinger Business Shared.
#
# Lo que hace:
#   1. Valida pre-flight (rama git, tests pasan, SSH key existe).
#   2. Sincroniza apps/api/ → servidor via rsync (excluye .env, vendor, storage, node_modules).
#   3. Corre composer install --no-dev en el servidor.
#   4. Limpia + reconstruye caches de Laravel.
#   5. Corre migraciones (con --force porque APP_ENV=production).
#   6. Health check post-deploy (GET /up).
#
# Uso:
#   scripts/deploy-api.sh                    # deploy de la rama actual
#   scripts/deploy-api.sh --skip-tests       # saltar phpunit local
#   scripts/deploy-api.sh --skip-migrate     # no correr migrate (sólo código)
#   scripts/deploy-api.sh --dry-run          # mostrar qué se sincronizaría sin tocar
#
# Requisitos:
#   - SSH key en ~/.ssh/hostinger_clicktoeat
#   - rsync, ssh, curl en local
#   - Estar en la raíz del repo

set -Eeuo pipefail

# ─── Config ────────────────────────────────────────────────────
SSH_HOST="86.38.202.72"
SSH_PORT="65002"
SSH_USER="u221820910"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/hostinger_clicktoeat}"
REMOTE_API_PATH="/home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html"
HEALTH_URL="https://clicktoeat-api.lumiaaisolutions.com/up"

LOCAL_API_DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/api"

# ─── Args ──────────────────────────────────────────────────────
SKIP_TESTS=0
SKIP_MIGRATE=0
DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --skip-tests)   SKIP_TESTS=1 ;;
        --skip-migrate) SKIP_MIGRATE=1 ;;
        --dry-run)      DRY_RUN=1 ;;
        -h|--help)      sed -n '3,25p' "$0"; exit 0 ;;
        *) echo "Argumento desconocido: $arg" >&2; exit 1 ;;
    esac
done

# ─── Helpers ──────────────────────────────────────────────────
log()  { printf '[deploy-api] %s\n' "$*"; }
fail() { printf '[deploy-api] ❌ %s\n' "$*" >&2; exit 1; }

remote() {
    ssh -i "${SSH_KEY}" -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new \
        "${SSH_USER}@${SSH_HOST}" "$@"
}

# ─── Pre-flight ───────────────────────────────────────────────
log "Pre-flight..."

[[ -d "${LOCAL_API_DIR}" ]] || fail "No encuentro ${LOCAL_API_DIR}. ¿Ejecutas desde la raíz del repo?"
[[ -r "${SSH_KEY}" ]]        || fail "SSH key no encontrada en ${SSH_KEY}"
command -v rsync >/dev/null  || fail "rsync no instalado"
command -v ssh   >/dev/null  || fail "ssh no instalado"
command -v curl  >/dev/null  || fail "curl no instalado"

# Verificar que la rama actual está limpia
if [[ -n "$(git -C "${LOCAL_API_DIR}/.." status --porcelain 2>/dev/null)" ]]; then
    log "⚠️  Hay cambios sin commitear. ¿Continuar? (y/N)"
    read -r answer
    [[ "${answer}" =~ ^[Yy]$ ]] || fail "Cancelado por usuario"
fi

# Tests locales (a menos que --skip-tests)
if (( SKIP_TESTS == 0 )); then
    log "Corriendo tests locales (phpunit)..."
    (cd "${LOCAL_API_DIR}" && vendor/bin/phpunit --no-coverage) || fail "Tests fallan. Usa --skip-tests para forzar."
fi

# ─── Confirmación ─────────────────────────────────────────────
log "Vas a desplegar:"
log "  source: ${LOCAL_API_DIR}/"
log "  target: ${SSH_USER}@${SSH_HOST}:${REMOTE_API_PATH}/"
if (( DRY_RUN )); then
    log "  modo:   DRY-RUN (no se aplican cambios)"
else
    log "  ¿Continuar? (y/N)"
    read -r answer
    [[ "${answer}" =~ ^[Yy]$ ]] || fail "Cancelado por usuario"
fi

# ─── Sync de archivos ─────────────────────────────────────────
log "Sincronizando archivos..."

RSYNC_OPTS=(
    -avz --delete
    --exclude='.env'
    --exclude='.env.*'
    --exclude='.git'
    --exclude='.gitignore'
    --exclude='vendor/'
    --exclude='node_modules/'
    --exclude='storage/app/public/uploads/'
    --exclude='storage/framework/cache/*'
    --exclude='storage/framework/sessions/*'
    --exclude='storage/framework/views/*'
    --exclude='storage/logs/*.log'
    --exclude='.phpunit.result.cache'
    --exclude='tests/'
    --exclude='composer.phar'
    -e "ssh -i ${SSH_KEY} -p ${SSH_PORT} -o StrictHostKeyChecking=accept-new"
)

if (( DRY_RUN )); then
    RSYNC_OPTS+=("--dry-run")
fi

rsync "${RSYNC_OPTS[@]}" \
    "${LOCAL_API_DIR}/" \
    "${SSH_USER}@${SSH_HOST}:${REMOTE_API_PATH}/" \
    || fail "rsync falló"

if (( DRY_RUN )); then
    log "✅ Dry-run completo. Sin cambios aplicados."
    exit 0
fi

# ─── Composer install + caches + migrate en servidor ─────────
log "Composer install (--no-dev) en servidor..."
remote "cd ${REMOTE_API_PATH} && composer install --no-dev --optimize-autoloader --no-interaction" \
    || fail "composer install falló en servidor"

log "Limpiando caches viejos..."
remote "cd ${REMOTE_API_PATH} && \
    php artisan config:clear && \
    php artisan route:clear && \
    php artisan view:clear && \
    php artisan cache:clear" \
    || fail "Limpieza de caches falló"

if (( SKIP_MIGRATE == 0 )); then
    log "Migraciones (--force)..."
    remote "cd ${REMOTE_API_PATH} && php artisan migrate --force" \
        || fail "Migración falló — INTERVENCIÓN MANUAL REQUERIDA"
fi

log "Reconstruyendo caches productivos..."
remote "cd ${REMOTE_API_PATH} && \
    php artisan config:cache && \
    php artisan route:cache && \
    php artisan view:cache" \
    || fail "Construcción de caches falló"

# ─── Health check post-deploy ─────────────────────────────────
log "Health check ${HEALTH_URL}..."
sleep 2
HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${HEALTH_URL}" || echo "000")
if [[ "${HTTP_CODE}" != "200" ]]; then
    fail "Health check FAIL — devolvió HTTP ${HTTP_CODE}. ROLLBACK manual recomendado."
fi

log "✅ Deploy API completado y health check OK"
exit 0
