#!/usr/bin/env bash
#
# ClickToEat — Backup diario de MySQL a almacenamiento off-site.
#
# Target: VPS dedicado (Hostinger KVM 2), corre localmente en el servidor
# (usuario `deploy`, sudo passwordless). Migrado desde el hosting compartido
# el 2026-08-07 — ver docs/runbook/migracion-vps-dedicado-2026-08-06.md.
#   - MySQL 8 local (127.0.0.1:3306, root sin password vía `sudo mysql`)
#   - Cron real disponible (`crontab -e`) — ya NO hace falta hPanel → "Trabajos Cron"
#
# Lo que hace:
#   1. mysqldump de la BD productiva (lee credenciales del .env de Laravel
#      o de variables exportadas).
#   2. Comprime con gzip -9.
#   3. Escribe manifest JSON con sha256 + tamaño.
#   4. Aplica retención local (default: 14 días en ~/backups/).
#   5. Sube a Backblaze B2 vía rclone SOLO SI B2_REMOTE/B2_BUCKET están
#      configurados — opcional, requiere que el usuario cree su propia
#      cuenta B2 (free tier 10GB, Claude no puede crear cuentas de
#      terceros). Sin esas variables, el backup queda solo local en el VPS
#      — sigue siendo válido como backup, solo sin copia off-site.
#   6. Pinga heartbeat (Healthchecks.io) y/o webhook Slack en fallo.
#
# ANTES DEL PRIMER USO en el servidor — ver scripts/README.md para procedimiento
# detallado de instalación de rclone, creación de remote B2 y configuración del cron
# (todo eso es opcional; el modo local-only funciona sin ninguna cuenta externa).

set -Eeuo pipefail

# ─── Cargar config ──────────────────────────────────────────────
CONFIG_FILE="${CONFIG_FILE:-$HOME/.config/clicktoeat-backup.env}"
if [[ -f "${CONFIG_FILE}" ]]; then
    set -a
    # shellcheck source=/dev/null
    . "${CONFIG_FILE}"
    set +a
fi

# Asegurar PATH (cron de hPanel no hereda el de tu shell login)
export PATH="$HOME/bin:/usr/local/bin:/usr/bin:/bin"

# ─── Variables ──────────────────────────────────────────────────
DB_NAME="${DB_NAME:?DB_NAME requerido (definir en ${CONFIG_FILE})}"
DB_USER="${DB_USER:?DB_USER requerido}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD requerido}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

# Off-site (B2) es opcional — si no están seteadas, el backup queda local-only.
B2_REMOTE="${B2_REMOTE:-}"
B2_BUCKET="${B2_BUCKET:-}"
B2_PREFIX="${B2_PREFIX:-backups/clicktoeat}"
OFFSITE_ENABLED=0
[[ -n "${B2_REMOTE}" && -n "${B2_BUCKET}" ]] && OFFSITE_ENABLED=1

HEARTBEAT_URL="${HEARTBEAT_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Sin off-site, retenemos más días localmente (no hay copia externa de respaldo).
RETENTION_LOCAL_DAYS="${RETENTION_LOCAL_DAYS:-$(( OFFSITE_ENABLED ? 3 : 14 ))}"
LOCAL_DIR="${LOCAL_DIR:-$HOME/backups}"

# ─── Constantes ─────────────────────────────────────────────────
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME="$(hostname -s 2>/dev/null || echo unknown)"
DUMP_BASENAME="${DB_NAME}-${TIMESTAMP}.sql.gz"
DUMP_PATH="${LOCAL_DIR}/${DUMP_BASENAME}"
MANIFEST_PATH="${LOCAL_DIR}/${DUMP_BASENAME}.manifest.json"
LOG_PREFIX="[clicktoeat-backup ${TIMESTAMP}]"

# ─── Helpers ────────────────────────────────────────────────────
log()  { printf '%s %s\n' "${LOG_PREFIX}" "$*"; }
fail() {
    local msg="$1"
    log "❌ FAIL: ${msg}"
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        curl -fsS -X POST -H 'Content-Type: application/json' \
            --max-time 10 \
            -d "$(printf '{"text":"❌ ClickToEat backup FAIL en %s: %s"}' "${HOSTNAME}" "${msg}")" \
            "${SLACK_WEBHOOK}" >/dev/null 2>&1 || true
    fi
    if [[ -n "${HEARTBEAT_URL}" ]]; then
        curl -fsS --max-time 10 "${HEARTBEAT_URL}/fail" >/dev/null 2>&1 || true
    fi
    exit 1
}

heartbeat_ok() {
    if [[ -n "${HEARTBEAT_URL}" ]]; then
        curl -fsS --max-time 10 "${HEARTBEAT_URL}" >/dev/null 2>&1 || true
    fi
}

trap 'fail "Aborted en línea $LINENO (exit $?)"' ERR

# ─── Pre-flight ─────────────────────────────────────────────────
log "Pre-flight..."

command -v mysqldump >/dev/null || fail "mysqldump no está en PATH"
command -v gzip      >/dev/null || fail "gzip no está en PATH"
command -v sha256sum >/dev/null || fail "sha256sum no está en PATH"

# rclone solo hace falta si el off-site está habilitado.
if (( OFFSITE_ENABLED )); then
    RCLONE_BIN="${RCLONE_BIN:-$HOME/bin/rclone}"
    if [[ ! -x "${RCLONE_BIN}" ]]; then
        if command -v rclone >/dev/null; then
            RCLONE_BIN="$(command -v rclone)"
        else
            fail "rclone no encontrado. Instalar como binario en ~/bin/rclone (ver scripts/README.md)"
        fi
    fi
else
    log "B2_REMOTE/B2_BUCKET no configurados — backup local-only (sin off-site)."
fi

mkdir -p "${LOCAL_DIR}"

# Espacio libre — en shared hosting el quota se mide distinto.
# Pedimos al menos 500 MB libres en el directorio (suficiente para varios dumps).
AVAIL_KB=$(df -k "${LOCAL_DIR}" 2>/dev/null | awk 'NR==2 {print $4}')
if [[ -n "${AVAIL_KB}" ]] && (( AVAIL_KB < 500 * 1024 )); then
    fail "Disco insuficiente en ${LOCAL_DIR}: $((AVAIL_KB/1024)) MB libres"
fi

# MySQL accesible. SEV-17: el password va por MYSQL_PWD env var en vez de
# `--password=` en la línea de comandos (visible en `ps`/CageFS audit logs).
if ! MYSQL_PWD="${DB_PASSWORD}" mysqladmin --user="${DB_USER}" \
                --host="${DB_HOST}" --port="${DB_PORT}" \
                --connect-timeout=5 ping --silent > /dev/null 2>&1; then
    fail "MySQL no responde en ${DB_HOST}:${DB_PORT}"
fi

# rclone remote existe (solo si off-site habilitado)
if (( OFFSITE_ENABLED )) && ! "${RCLONE_BIN}" listremotes 2>/dev/null | grep -q "^${B2_REMOTE}:$"; then
    fail "rclone remote '${B2_REMOTE}' no configurado (corre '${RCLONE_BIN} config')"
fi

# ─── Dump ───────────────────────────────────────────────────────
log "Dumping ${DB_NAME}@${DB_HOST}..."
START_DUMP=$(date +%s)

# OJO en Hostinger Shared: el user MySQL típicamente NO tiene privilegios
# para --routines y --triggers (requieren acceso a mysql.proc) ni para
# tablespaces. Omitir flags problemáticos.
#
# SEV-17 — password via MYSQL_PWD env (no `--password=`) para que no aparezca
# en `ps aux`. La env var queda sólo en el proceso mysqldump, no exportada
# al shell padre.
MYSQL_PWD="${DB_PASSWORD}" mysqldump \
    --user="${DB_USER}" \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --single-transaction \
    --quick \
    --skip-lock-tables \
    --default-character-set=utf8mb4 \
    --set-gtid-purged=OFF \
    --no-tablespaces \
    "${DB_NAME}" \
  | gzip -9 > "${DUMP_PATH}"

DUMP_SIZE=$(stat -c%s "${DUMP_PATH}" 2>/dev/null || stat -f%z "${DUMP_PATH}")
SHA256=$(sha256sum "${DUMP_PATH}" | awk '{print $1}')
DURATION_DUMP=$(( $(date +%s) - START_DUMP ))

log "Dump OK: ${DUMP_SIZE} bytes, sha256=${SHA256:0:16}..., ${DURATION_DUMP}s"

# Sanity: que el dump no esté vacío / sospechoso
if (( DUMP_SIZE < 1024 )); then
    fail "Dump sospechosamente pequeño (${DUMP_SIZE} bytes) — algo está mal con la BD"
fi

# ─── Manifest ───────────────────────────────────────────────────
cat > "${MANIFEST_PATH}" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "hostname": "${HOSTNAME}",
  "db": "${DB_NAME}",
  "size_bytes": ${DUMP_SIZE},
  "sha256": "${SHA256}",
  "duration_dump_sec": ${DURATION_DUMP},
  "format": "mysqldump-gzip-9"
}
EOF

# ─── Upload off-site (opcional) ──────────────────────────────────
if (( OFFSITE_ENABLED )); then
    YEAR_MONTH="$(date -u +%Y/%m)"
    REMOTE_DIR="${B2_REMOTE}:${B2_BUCKET}/${B2_PREFIX}/${YEAR_MONTH}"

    log "Uploading a ${REMOTE_DIR}..."
    START_UP=$(date +%s)

    "${RCLONE_BIN}" copy --no-traverse --quiet \
        "${DUMP_PATH}"     "${REMOTE_DIR}/" \
        || fail "Upload del dump falló"

    "${RCLONE_BIN}" copy --no-traverse --quiet \
        "${MANIFEST_PATH}" "${REMOTE_DIR}/" \
        || fail "Upload del manifest falló"

    DURATION_UP=$(( $(date +%s) - START_UP ))
    log "Upload OK: ${DURATION_UP}s"
else
    log "Sin off-site configurado — el backup queda solo en ${LOCAL_DIR} (VPS)."
fi

# ─── Retención local ────────────────────────────────────────────
log "Aplicando retención local (${RETENTION_LOCAL_DAYS} días)..."
find "${LOCAL_DIR}" -maxdepth 1 -name "${DB_NAME}-*.sql.gz"        -mtime +${RETENTION_LOCAL_DAYS} -delete 2>/dev/null || true
find "${LOCAL_DIR}" -maxdepth 1 -name "${DB_NAME}-*.manifest.json"  -mtime +${RETENTION_LOCAL_DAYS} -delete 2>/dev/null || true

# ─── Cierre ─────────────────────────────────────────────────────
TOTAL_DURATION=$(( $(date +%s) - START_DUMP ))
if (( OFFSITE_ENABLED )); then
    log "✅ Backup completado: total ${TOTAL_DURATION}s, ${DUMP_SIZE} bytes (local + off-site)"
else
    log "✅ Backup completado: total ${TOTAL_DURATION}s, ${DUMP_SIZE} bytes (solo local en ${LOCAL_DIR})"
fi

heartbeat_ok
exit 0
