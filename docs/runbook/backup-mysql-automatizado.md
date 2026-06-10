# Runbook — Backup MySQL automatizado (diseño + implementación)

> Diseño productivo del pipeline de backup. Hoy **no está implementado** — este documento define la política y el camino.

## Objetivos (SLO)

| Métrica                            | Objetivo                          |
|-----------------------------------|-----------------------------------|
| **RPO** (Recovery Point Objective) | ≤ 24h en peor caso (backup diario) |
| **RTO** (Recovery Time Objective)  | ≤ 2h restore + validación         |
| **Retención**                       | 7 diarios + 4 semanales + 12 mensuales |
| **Off-site**                        | Sí, otra región/proveedor          |
| **Encriptación at-rest**             | Sí (AES-256)                      |
| **Validación de integridad**         | SHA-256 + restore drill mensual    |
| **Alertas en fallo**                 | Sí, antes del próximo intento      |

## Política de retención

```
Hoy ────────────────────────────────────────────────►
│ 7 diarios:    día 1, 2, 3, 4, 5, 6, 7
│ 4 semanales:  semana 2, 3, 4, 5
│ 12 mensuales: mes 2, 3, 4, ..., 13
│ (después: cold storage / Glacier o purga)
```

Esto da ventana de ~1 año con costo razonable y granularidad fina en lo reciente.

## Diseño del job

### Componentes

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Cron host /   │───────▶│  backup-script  │───────▶│  S3 / R2 /      │
│  k8s CronJob /  │  cada  │  (Docker exec   │ upload │  Backblaze B2   │
│  systemd timer  │   día  │   mysqldump)    │        │  (off-site)     │
└─────────────────┘        └────────┬────────┘        └────────┬────────┘
                                    │                          │
                                    ▼                          ▼
                            ┌───────────────┐         ┌──────────────────┐
                            │  Pre-flight:  │         │  Manifest JSON   │
                            │  - free disk  │         │  con SHA-256,    │
                            │  - mysql up   │         │  size, duration  │
                            └───────────────┘         └────────┬─────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │  Slack/Email │
                                                       │   on fail    │
                                                       └──────────────┘
```

### Script ejemplo

```bash
#!/usr/bin/env bash
# scripts/backup-mysql.sh — backup diario de la BD a S3 + retención
#
# Requiere en el host:
#   - aws cli configurado con perfil con permisos s3:PutObject al bucket
#   - docker compose disponible en PATH
#   - variables del .env (MYSQL_ROOT_PASSWORD, S3_BUCKET, S3_PREFIX)
#
# Programar con cron del host:
#   0 3 * * *   /opt/clicktoeat/scripts/backup-mysql.sh >> /var/log/clicktoeat/backup.log 2>&1

set -Eeuo pipefail

# ─── Config ────────────────────────────────────────
DB_NAME="${DB_NAME:-clicktoeat}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:?ROOT_PASSWORD required}"
S3_BUCKET="${S3_BUCKET:?S3_BUCKET required}"
S3_PREFIX="${S3_PREFIX:-backups/clicktoeat}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
RETENTION_DIAS=7
RETENTION_SEMANAS=4
RETENTION_MESES=12

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORKDIR=$(mktemp -d)
DUMP_FILE="${WORKDIR}/${DB_NAME}-${TIMESTAMP}.sql.gz"

cleanup() { rm -rf "${WORKDIR}"; }
trap cleanup EXIT

notify_fail() {
    local msg="$1"
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        curl -fsS -X POST -H 'Content-Type: application/json' \
            -d "{\"text\":\"❌ ClickToEat backup FAIL ($(hostname)): ${msg}\"}" \
            "${SLACK_WEBHOOK}" || true
    fi
    echo "FAIL: ${msg}" >&2
    exit 1
}

# ─── Pre-flight ────────────────────────────────────
echo "[$(date -u)] Pre-flight checks..."

# Disco con espacio (≥ 2 GB libres en /tmp)
AVAIL_KB=$(df -k "${WORKDIR}" | awk 'NR==2 {print $4}')
if (( AVAIL_KB < 2 * 1024 * 1024 )); then
    notify_fail "Disco insuficiente en ${WORKDIR}: $((AVAIL_KB/1024)) MB"
fi

# MySQL responde
if ! docker compose exec -T mysql mysqladmin -u root -p"${MYSQL_ROOT_PASSWORD}" ping --silent; then
    notify_fail "MySQL no responde"
fi

# ─── Dump ──────────────────────────────────────────
echo "[$(date -u)] Dumping ${DB_NAME}..."
START=$(date +%s)

docker compose exec -T mysql mysqldump \
    -u root -p"${MYSQL_ROOT_PASSWORD}" \
    --single-transaction \
    --routines --triggers \
    --quick \
    --default-character-set=utf8mb4 \
    "${DB_NAME}" \
  | gzip -9 > "${DUMP_FILE}"

DUMP_SIZE=$(stat -f%z "${DUMP_FILE}" 2>/dev/null || stat -c%s "${DUMP_FILE}")
SHA256=$(sha256sum "${DUMP_FILE}" | awk '{print $1}')
DURATION=$(( $(date +%s) - START ))

echo "[$(date -u)] Dump: ${DUMP_SIZE} bytes, SHA256=${SHA256}, ${DURATION}s"

# Validación mínima: el dump no está vacío
if (( DUMP_SIZE < 1024 )); then
    notify_fail "Dump sospechosamente pequeño (${DUMP_SIZE} bytes)"
fi

# ─── Upload a S3 ───────────────────────────────────
echo "[$(date -u)] Uploading to s3://${S3_BUCKET}/${S3_PREFIX}/..."

S3_KEY="${S3_PREFIX}/$(date -u +%Y/%m)/$(basename "${DUMP_FILE}")"

aws s3 cp "${DUMP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD_IA \
    --metadata "sha256=${SHA256},duration=${DURATION},db=${DB_NAME}" \
    || notify_fail "Upload a S3 falló"

# Manifest separado para listado rápido
MANIFEST_KEY="${S3_PREFIX}/manifests/$(date -u +%Y%m%d).json"
cat > "${WORKDIR}/manifest.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "db": "${DB_NAME}",
  "size_bytes": ${DUMP_SIZE},
  "sha256": "${SHA256}",
  "duration_sec": ${DURATION},
  "s3_key": "${S3_KEY}"
}
EOF
aws s3 cp "${WORKDIR}/manifest.json" "s3://${S3_BUCKET}/${MANIFEST_KEY}"

# ─── Retención ─────────────────────────────────────
echo "[$(date -u)] Aplicando retención..."

# Listar y borrar mayores a 7 días en /YYYY/MM/
# (Para semanales/mensuales usar lifecycle policy del bucket — más confiable que script)
THRESHOLD_DAILY=$(date -u -d "-${RETENTION_DIAS} days" +%Y%m%dT)

aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" --recursive \
  | awk '{print $4}' \
  | grep "${DB_NAME}-" \
  | while read -r KEY; do
      KEY_DATE=$(echo "${KEY}" | grep -oP '\d{8}T')
      if [[ -n "${KEY_DATE}" && "${KEY_DATE}" < "${THRESHOLD_DAILY}" ]]; then
          # OJO: ya delegamos a S3 lifecycle. Esto es defensivo.
          echo "  → expired: ${KEY}"
          # aws s3 rm "s3://${S3_BUCKET}/${KEY}"
      fi
  done

echo "[$(date -u)] ✅ Backup completado: ${DURATION}s, ${DUMP_SIZE} bytes"
```

### S3 lifecycle (recomendado en vez de retención por script)

Aplicar al bucket:

```json
{
  "Rules": [
    {
      "Id": "Diarios → IA después de 30d → Glacier después de 90d → expire después de 400d",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/clicktoeat/" },
      "Transitions": [
        { "Days":  30, "StorageClass": "STANDARD_IA" },
        { "Days":  90, "StorageClass": "GLACIER" }
      ],
      "Expiration": { "Days": 400 }
    }
  ]
}
```

### Encriptación

- S3 server-side encryption con AES-256 por default → activar a nivel bucket (`AES256` o KMS).
- Si requisitos legales: KMS con customer-managed key.

## Cron

### Self-hosted (Docker en VM)

```cron
# /etc/cron.d/clicktoeat-backup
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin

# Diario a las 03:00 UTC
0 3 * * * deployer /opt/clicktoeat/scripts/backup-mysql.sh >> /var/log/clicktoeat/backup.log 2>&1
```

### Kubernetes (CronJob)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clicktoeat-mysql-backup
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: <registro>/clicktoeat-backup:latest
            envFrom:
              - secretRef:
                  name: backup-secrets
```

### Cloud DB (RDS/CloudSQL)

Si la BD es managed:
- **RDS**: habilitar `BackupRetentionPeriod` ≥ 7 días + snapshots automatizados. Para off-site, copy snapshot a otra región.
- **CloudSQL**: backups automáticos + point-in-time recovery activado.
- En estos casos, el script de arriba es complementario (no es la fuente primaria).

## Monitoreo

### Alertas

| Evento                                     | Severidad | Acción                                      |
|-------------------------------------------|-----------|---------------------------------------------|
| Job falla (script `exit 1`)                | 🔴 Critical | Page on-call. Backup pendiente.             |
| Job no corre en 25h                        | 🔴 Critical | Cron caído? Script bloqueado?               |
| Dump < 1 KB                                | 🔴 Critical | Algo está muy mal con la BD.                |
| Dump 50% más pequeño que el promedio       | 🟠 Warning  | Investigar: ¿se borraron datos no querido? |
| Upload a S3 falla                          | 🔴 Critical | Sin off-site copy del día.                  |

Implementación: el script ya manda webhook a Slack en fallo. Para "no corrió en 25h" usar **dead-man switch** (Healthchecks.io o Cronitor):
- El script termina con `curl -fsS https://hc-ping.com/<uuid>`.
- Si el servicio no recibe el ping en la ventana esperada, alerta.

### Métricas

Si hay Prometheus/Grafana:
- Gauge `clicktoeat_backup_last_success_timestamp`.
- Gauge `clicktoeat_backup_last_size_bytes`.
- Histogram `clicktoeat_backup_duration_seconds`.

## Restore drill mensual

**Sin drill, los backups son ficción.** Procedimiento:

1. Primer lunes de cada mes, levantar MySQL aislado:
   ```bash
   docker run --rm -d --name mysql-drill -e MYSQL_ROOT_PASSWORD=root mysql:8.0
   ```
2. Descargar el backup más reciente.
3. Restaurarlo. Cronometrar.
4. Validar conteos (deben coincidir con el manifest del día).
5. Cerrar el container.
6. Si el drill toma > RTO objetivo (2h), evaluar reducir tamaño / cambiar formato.
7. Documentar resultado en `docs/runbook/drills/YYYY-MM.md` (a crear en su primer uso).

## Implementación actual

El script real vive en [`scripts/backup-mysql.sh`](../../scripts/backup-mysql.sh) (production-ready, validado con `bash -n`).

**Stack del backup**:
- `mysqldump` nativo (no Docker — corre en Hostinger VPS).
- `rclone` para subir a Backblaze B2 (más barato que S3 para el caso de "escribe mucho, lee poco", sin egress charges sorpresivos).
- Manifest JSON con `sha256` por backup.
- Webhook Slack en fallo.
- Dead-man switch via Healthchecks.io (`HEARTBEAT_URL`).

Procedimiento de deploy del script: [`scripts/README.md`](../../scripts/README.md).

## TODO operativo

- [ ] Crear bucket B2 dedicado `clicktoeat-backups` con lifecycle (7 días Standard → 30 días Cold → 1 año delete).
- [ ] Generar key id/application key en B2 con permisos sólo de `writeFiles` al bucket (no `deleteFiles`, no `readFiles` desde el server productivo — el server puede subir y olvidar; restore se hace desde otra máquina con permisos completos).
- [ ] Crear cuenta + check en Healthchecks.io (period=24h, grace=2h).
- [ ] Webhook Slack en `#alertas-clicktoeat`.
- [ ] Subir script al servidor productivo, configurar `/etc/clicktoeat/backup.env`, agendar cron.
- [ ] **Primer restore drill** dentro de los 7 días siguientes al primer backup automatizado.
- [ ] Agregar alertas al monitoring (cuando se introduzca — ver `docs/issues/devops-faltante.md`).

## Referencias

- [`restaurar-backup-mysql.md`](restaurar-backup-mysql.md) — qué hacer cuando hay que usar uno de estos backups.
- [`bd-llena.md`](bd-llena.md) — qué hacer cuando es un problema de espacio, no de datos.
- AWS S3 Lifecycle: <https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html>
- Healthchecks.io dead-man switch: <https://healthchecks.io/>
