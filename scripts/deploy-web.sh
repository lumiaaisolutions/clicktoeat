#!/usr/bin/env bash
#
# ClickToEat — Deploy del Frontend (Next.js standalone) a Hostinger Business Shared.
#
# Lo que hace:
#   1. Build local con NEXT_PUBLIC_API_URL apuntando a prod.
#   2. Empaqueta .next/standalone + .next/static + public en un tar.gz.
#   3. Sube el tar al servidor (~/nodejs/).
#   4. Extrae en el servidor, limpia caché viejo.
#   5. Reinicia la app via Passenger (lsnode).
#   6. Health check post-deploy (GET https://clicktoeat.lumiaaisolutions.com).
#
# Uso:
#   scripts/deploy-web.sh                    # build + deploy + restart
#   scripts/deploy-web.sh --skip-build       # asume que ya existe .next/standalone
#   scripts/deploy-web.sh --dry-run          # no sube nada
#
# Requisitos:
#   - SSH key en ~/.ssh/hostinger_clicktoeat
#   - Node 20 + npm en local
#   - rsync/scp en local
#   - Estar en la raíz del repo

set -Eeuo pipefail

# ─── Config ────────────────────────────────────────────────────
SSH_HOST="86.38.202.72"
SSH_PORT="65002"
SSH_USER="u221820910"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/hostinger_clicktoeat}"
REMOTE_NODE_PATH="/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs"
API_URL="${API_URL:-https://clicktoeat-api.lumiaaisolutions.com/api/v1}"
APP_URL="${APP_URL:-https://clicktoeat.lumiaaisolutions.com}"
HEALTH_URL="${APP_URL}/"

LOCAL_WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/web"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

# ─── Args ──────────────────────────────────────────────────────
SKIP_BUILD=0
DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=1 ;;
        --dry-run)    DRY_RUN=1 ;;
        -h|--help)    sed -n '3,25p' "$0"; exit 0 ;;
        *) echo "Argumento desconocido: $arg" >&2; exit 1 ;;
    esac
done

# ─── Helpers ──────────────────────────────────────────────────
log()  { printf '[deploy-web] %s\n' "$*"; }
fail() { printf '[deploy-web] ❌ %s\n' "$*" >&2; exit 1; }

remote() {
    ssh -i "${SSH_KEY}" -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new \
        "${SSH_USER}@${SSH_HOST}" "$@"
}

# ─── Pre-flight ───────────────────────────────────────────────
log "Pre-flight..."

[[ -d "${LOCAL_WEB_DIR}" ]] || fail "No encuentro ${LOCAL_WEB_DIR}"
[[ -r "${SSH_KEY}" ]]        || fail "SSH key no encontrada en ${SSH_KEY}"
command -v node  >/dev/null  || fail "node no instalado"
command -v npm   >/dev/null  || fail "npm no instalado"
command -v tar   >/dev/null  || fail "tar no instalado"
command -v scp   >/dev/null  || fail "scp no instalado"
command -v curl  >/dev/null  || fail "curl no instalado"

# ─── Build ─────────────────────────────────────────────────────
if (( SKIP_BUILD == 0 )); then
    log "Building con NEXT_PUBLIC_API_URL=${API_URL}..."
    cd "${LOCAL_WEB_DIR}"

    [[ -d node_modules ]] || npm ci
    NEXT_PUBLIC_API_URL="${API_URL}" NEXT_PUBLIC_APP_URL="${APP_URL}" \
        npm run build \
        || fail "Build de Next.js falló"
fi

# Validar que el build standalone existe
[[ -d "${LOCAL_WEB_DIR}/.next/standalone" ]] \
    || fail "No existe .next/standalone — ¿next.config.mjs tiene 'output: standalone'? Sin standalone no se puede deployar a Passenger."

# ─── Empaquetar ────────────────────────────────────────────────
log "Empaquetando..."

TARBALL="${TMP_DIR}/web-build.tar.gz"

# Standalone trae su propio package.json + node_modules mínimo.
# .next/static debe ir en .next/static dentro del standalone.
# public se copia a la raíz del standalone.
#
# Usamos staging directory en vez de `tar --transform` porque BSD tar
# (macOS default) no lo soporta. cp -R + tar simple funciona en ambos.
cd "${LOCAL_WEB_DIR}"

STAGING="${TMP_DIR}/staging"
mkdir -p "${STAGING}/.next"
cp -R .next/standalone/. "${STAGING}/"
cp -R .next/static       "${STAGING}/.next/static"
cp -R public             "${STAGING}/public"

tar -czf "${TARBALL}" -C "${STAGING}" .

TARBALL_SIZE=$(stat -c%s "${TARBALL}" 2>/dev/null || stat -f%z "${TARBALL}")
log "Tarball: $(( TARBALL_SIZE / 1024 / 1024 )) MB"

# ─── Confirmación ─────────────────────────────────────────────
log "Vas a desplegar:"
log "  tarball: ${TARBALL}"
log "  target:  ${SSH_USER}@${SSH_HOST}:${REMOTE_NODE_PATH}/"
log "  health:  ${HEALTH_URL}"

if (( DRY_RUN )); then
    log "  modo:    DRY-RUN (no se aplican cambios)"
    log "✅ Dry-run completo."
    exit 0
fi

log "  ¿Continuar? (y/N)"
read -r answer
[[ "${answer}" =~ ^[Yy]$ ]] || fail "Cancelado por usuario"

# ─── Upload + extract + restart ───────────────────────────────
log "Subiendo tarball..."
scp -i "${SSH_KEY}" -P "${SSH_PORT}" -o StrictHostKeyChecking=accept-new \
    "${TARBALL}" \
    "${SSH_USER}@${SSH_HOST}:${REMOTE_NODE_PATH}/web-build.tar.gz" \
    || fail "scp falló"

log "Extrayendo en servidor + reiniciando..."
# shellcheck disable=SC2087
remote bash <<EOF || fail "Deploy en servidor falló"
set -e
cd ${REMOTE_NODE_PATH}

# Backup del build actual por si hay que rollback
if [[ -d .next ]]; then
    rm -rf .next.previous
    mv .next .next.previous
fi
if [[ -d public ]]; then
    rm -rf public.previous
    mv public public.previous
fi

# Extraer nuevo build
tar -xzf web-build.tar.gz

# Limpiar caché de Next
rm -rf .next/cache

# Restart de Passenger
if command -v passenger-config >/dev/null 2>&1; then
    passenger-config restart-app ${REMOTE_NODE_PATH}
else
    # Fallback: tocar tmp/restart.txt (mecanismo estándar de Passenger)
    mkdir -p tmp && touch tmp/restart.txt
fi

# Limpiar tarball
rm -f web-build.tar.gz
EOF

# ─── Health check post-deploy ─────────────────────────────────
log "Esperando 5s a que Passenger reinicie..."
sleep 5

log "Health check ${HEALTH_URL}..."
HTTP_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${HEALTH_URL}" || echo "000")
if [[ "${HTTP_CODE}" != "200" ]]; then
    fail "Health check FAIL — devolvió HTTP ${HTTP_CODE}. Considera rollback (.next.previous existe en servidor)."
fi

log "✅ Deploy Frontend completado y health check OK"
log "💡 Rollback rápido si algo falla más tarde:"
log "   ssh ... 'cd ${REMOTE_NODE_PATH} && rm -rf .next public && mv .next.previous .next && mv public.previous public && touch tmp/restart.txt'"
exit 0
