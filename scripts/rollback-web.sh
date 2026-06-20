#!/usr/bin/env bash
#
# ClickToEat — Rollback rápido del frontend Next.js a la versión anterior.
#
# Lo que hace:
#   1. SSH al VPS Hostinger.
#   2. Renombra `.next` a `.next.failed-<timestamp>` (preserva el bundle roto
#      para diagnóstico forense).
#   3. Restaura `.next.previous` → `.next`.
#   4. Mismo swap para `public` y `public.previous`.
#   5. `touch tmp/restart.txt` → Passenger recarga.
#   6. Health check.
#
# Uso:
#   scripts/rollback-web.sh                    # rollback al previo
#   scripts/rollback-web.sh --check            # solo lista estado, no toca nada
#   scripts/rollback-web.sh --no-health-check  # no espera health post-rollback
#
# Requisitos:
#   - SSH key en ~/.ssh/hostinger_clicktoeat (o vía SSH_KEY env)
#   - El deploy anterior debe haber dejado .next.previous / public.previous
#     (deploy-web.sh los crea en cada deploy)
#
# Si no hay .next.previous, este script falla con mensaje claro — en ese caso
# hay que redeployar manualmente desde local o restaurar de snapshot Hostinger.

set -Eeuo pipefail

# ─── Config ────────────────────────────────────────────────────
SSH_HOST="86.38.202.72"
SSH_PORT="65002"
SSH_USER="u221820910"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/hostinger_clicktoeat}"
REMOTE_NODE_PATH="/home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs"
HEALTH_URL="https://clicktoeat.lumiaaisolutions.com/"

# ─── Args ──────────────────────────────────────────────────────
CHECK_ONLY=0
SKIP_HEALTH=0
for arg in "$@"; do
    case "$arg" in
        --check)            CHECK_ONLY=1 ;;
        --no-health-check)  SKIP_HEALTH=1 ;;
        -h|--help)          sed -n '3,25p' "$0"; exit 0 ;;
        *) echo "Argumento desconocido: $arg" >&2; exit 1 ;;
    esac
done

# ─── Helpers ──────────────────────────────────────────────────
log()  { printf '[rollback-web] %s\n' "$*"; }
fail() { printf '[rollback-web] ❌ %s\n' "$*" >&2; exit 1; }

# ─── Pre-flight local ─────────────────────────────────────────
log "Pre-flight..."
[[ -f "${SSH_KEY}" ]] || fail "SSH key no encontrada en ${SSH_KEY}"
command -v ssh >/dev/null || fail "ssh no instalado"
command -v curl >/dev/null || fail "curl no instalado"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Heredoc con el script remoto. Usamos 'bash -s' para que Hostinger CageFS
# no rechace exec inline (visto en el outage 2026-06-19).
REMOTE_SCRIPT=$(cat <<REMOTE_EOF
set -Eeuo pipefail
cd "${REMOTE_NODE_PATH}" || { echo "ERR: no se puede entrar a ${REMOTE_NODE_PATH}"; exit 1; }

echo "=== Estado actual ==="
ls -la | grep -E "^d.*\.next|^d.*public" | head -10

if [[ ${CHECK_ONLY} -eq 1 ]]; then
    echo "=== Modo --check: NO se aplican cambios ==="
    exit 0
fi

if [[ ! -d .next.previous ]]; then
    echo "ERR: no existe .next.previous — no hay versión anterior a la que volver."
    echo "Opciones: redeploy desde local con deploy-web.sh o restaurar snapshot Hostinger."
    exit 1
fi
if [[ ! -d public.previous ]]; then
    echo "ERR: no existe public.previous — estado inconsistente."
    exit 1
fi

echo "=== Aplicando rollback ==="
# Limpia failed previo si quedó
rm -rf ".next.failed-${TIMESTAMP}" "public.failed-${TIMESTAMP}" 2>/dev/null || true

# Swap atómico (mv en mismo filesystem es atómico)
mv .next ".next.failed-${TIMESTAMP}"
mv .next.previous .next
mv public ".public-tmp-${TIMESTAMP}"
mv public.previous public
mv ".public-tmp-${TIMESTAMP}" "public.failed-${TIMESTAMP}"

# Restart Passenger
touch tmp/restart.txt 2>/dev/null || mkdir -p tmp && touch tmp/restart.txt

echo "=== Estado tras rollback ==="
ls -la | grep -E "^d.*\.next|^d.*public" | head -10
echo "ROLLBACK_DONE"
REMOTE_EOF
)

# ─── Ejecutar ──────────────────────────────────────────────────
log "Conectando al VPS..."
# `ssh ... bash -s` con stdin del heredoc — más robusto que ssh inline command
# para Hostinger CageFS (vimos "exec request failed on channel 0" con inline).
if ! ssh -i "${SSH_KEY}" -p "${SSH_PORT}" \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=20 \
        "${SSH_USER}@${SSH_HOST}" \
        "bash -s" <<<"${REMOTE_SCRIPT}"; then
    fail "Comando remoto falló — revisar conexión SSH y estado del VPS."
fi

if [[ ${CHECK_ONLY} -eq 1 ]]; then
    log "✅ Check completo."
    exit 0
fi

# ─── Health check ─────────────────────────────────────────────
if [[ ${SKIP_HEALTH} -eq 1 ]]; then
    log "Skip health check (--no-health-check)."
    exit 0
fi

log "Esperando 8s a que Passenger reinicie..."
sleep 8

log "Health check ${HEALTH_URL}..."
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${HEALTH_URL}" || echo "000")

if [[ "${HTTP_CODE}" == "200" ]]; then
    log "✅ Rollback completo y health check OK (HTTP ${HTTP_CODE})"
    exit 0
else
    log "⚠️  Rollback aplicado pero health check devolvió HTTP ${HTTP_CODE}"
    log "   Posibles causas: Passenger todavía iniciando (espera 30s y reintenta), "
    log "   o el bundle .next.previous también está roto."
    log "   Verifica logs en VPS: ${REMOTE_NODE_PATH}/stderr.log"
    exit 2
fi
