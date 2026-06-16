#!/usr/bin/env bash
#
# ClickToEat — Backup restore drill (F80)
#
# Verifica mensualmente que el dump más reciente generado por backup-mysql.sh
# es restaurable. Pasos:
#   1. Baja el último .sql.gz desde B2 (vía rclone) — o usa el local más nuevo
#      en ~/backups/ si --local-only.
#   2. Crea BD temporal con sufijo _restoretest_YYYYMMDDHHMM.
#   3. Hace mysql < dump.
#   4. Cuenta filas de tablas clave (locales, pedidos, users, productos) y
#      las compara contra la BD productiva (deben coincidir +/- 5%).
#   5. Drop de la BD temporal.
#   6. Reporta vía heartbeat / Slack si falla.
#
# Diseñado para correr 1x al mes desde el cron de hPanel:
#   0 3 1 * *  /home/u221820910/scripts/backup-test.sh --local-only >> ~/backups/test.log 2>&1
#
# IMPORTANTE: tu usuario MySQL en Hostinger no puede CREATE DATABASE. Para
# usar este script en prod necesitas que el super admin del VPS te dé una
# segunda BD pre-creada `u221820910_clicktoeat_test` y pongas su nombre en
# RESTORE_DB. Si no la tienes, este script falla intencionalmente — la idea
# es que prefieras eso a pensar que el backup sirve cuando no.

set -Eeuo pipefail

CONFIG_FILE="${CONFIG_FILE:-$HOME/.config/clicktoeat-backup.env}"
if [[ -f "${CONFIG_FILE}" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "${CONFIG_FILE}"
    set +a
fi

# ─── Defaults ──────────────────────────────────────────────────
LOCAL_ONLY=false
[[ "${1:-}" == "--local-only" ]] && LOCAL_ONLY=true

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
RESTORE_DB="${RESTORE_DB:-${DB_DATABASE}_restoretest}"
TOLERANCE_PCT="${TOLERANCE_PCT:-5}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
HEARTBEAT_URL="${BACKUP_TEST_HEARTBEAT_URL:-}"

TS=$(date +%Y%m%d%H%M)
log()  { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
fail() { log "FAIL: $*"; notify_slack "❌ backup-test FAILED: $*"; exit 1; }
notify_slack() {
    [[ -z "$SLACK_WEBHOOK" ]] && return 0
    local msg
    msg=$(printf '%s' "$1" | sed 's/"/\\"/g')
    curl -fsS -m 10 -H 'Content-Type: application/json' -d "{\"text\":\"$msg\"}" "$SLACK_WEBHOOK" >/dev/null || true
}

trap 'fail "abort en $LINENO"' ERR

# ─── 1. Localizar el dump más reciente ─────────────────────────
if $LOCAL_ONLY; then
    DUMP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1 || true)
    [[ -z "$DUMP_FILE" ]] && fail "sin backups en $BACKUP_DIR"
    log "usando dump local: $DUMP_FILE"
else
    [[ -z "${RCLONE_REMOTE:-}" ]] && fail "RCLONE_REMOTE no configurado en $CONFIG_FILE"
    log "bajando último backup desde $RCLONE_REMOTE"
    LATEST=$($HOME/bin/rclone lsf "$RCLONE_REMOTE/clicktoeat/" --files-only | sort | tail -1)
    [[ -z "$LATEST" ]] && fail "no encontré backups en $RCLONE_REMOTE"
    DUMP_FILE="$BACKUP_DIR/$LATEST"
    $HOME/bin/rclone copy "$RCLONE_REMOTE/clicktoeat/$LATEST" "$BACKUP_DIR/" || fail "rclone copy"
fi

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
log "dump: $DUMP_FILE ($(numfmt --to=iec-i --suffix=B $DUMP_SIZE 2>/dev/null || echo "${DUMP_SIZE}B"))"
[[ "$DUMP_SIZE" -lt 1024 ]] && fail "dump sospechosamente pequeño (< 1KB)"

# ─── 2. Drop si existía + restore ──────────────────────────────
log "limpiando $RESTORE_DB"
mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -h"${DB_HOST:-localhost}" -e "DROP DATABASE IF EXISTS \`$RESTORE_DB\`; CREATE DATABASE \`$RESTORE_DB\`;" \
    || fail "no puedo crear $RESTORE_DB — pídele al admin del VPS pre-crearla con tu permiso"

log "restaurando dump…"
zcat "$DUMP_FILE" | mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -h"${DB_HOST:-localhost}" "$RESTORE_DB" \
    || fail "restore mysql"

# ─── 3. Validar row counts contra producción ───────────────────
TABLES=("locales" "users" "pedidos" "productos" "categorias")
ANY_BAD=false

for T in "${TABLES[@]}"; do
    PROD=$(mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -h"${DB_HOST:-localhost}" -N -B -e \
        "SELECT COUNT(*) FROM \`$DB_DATABASE\`.\`$T\`" 2>/dev/null || echo 0)
    REST=$(mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -h"${DB_HOST:-localhost}" -N -B -e \
        "SELECT COUNT(*) FROM \`$RESTORE_DB\`.\`$T\`" 2>/dev/null || echo 0)

    if [[ "$PROD" -eq 0 ]]; then
        log "$T: prod=0 rest=$REST (skip, prod vacía)"
        continue
    fi

    DIFF_PCT=$(awk -v p="$PROD" -v r="$REST" 'BEGIN { d=(p-r); if(d<0)d=-d; printf "%.1f", (d/p)*100 }')
    if awk -v d="$DIFF_PCT" -v t="$TOLERANCE_PCT" 'BEGIN { exit !(d > t) }'; then
        log "$T: prod=$PROD rest=$REST diff=${DIFF_PCT}% ❌"
        ANY_BAD=true
    else
        log "$T: prod=$PROD rest=$REST diff=${DIFF_PCT}% ✓"
    fi
done

# ─── 4. Cleanup ────────────────────────────────────────────────
mysql -u"$DB_USERNAME" -p"$DB_PASSWORD" -h"${DB_HOST:-localhost}" -e "DROP DATABASE IF EXISTS \`$RESTORE_DB\`;" \
    || log "warning: no pude drop $RESTORE_DB — borra manual"

if $ANY_BAD; then
    fail "row counts difieren > ${TOLERANCE_PCT}% en al menos una tabla"
fi

log "OK: restore probado exitosamente"
notify_slack "✅ backup-test OK · dump $(basename "$DUMP_FILE")"
[[ -n "$HEARTBEAT_URL" ]] && curl -fsS -m 10 "$HEARTBEAT_URL" >/dev/null || true
