# Runbook — Rollback del frontend Next.js a la versión anterior

> Cuándo aplicar: cuando el último `deploy-web.sh` deja el sitio en 5xx
> y `Health check FAIL` aparece en la salida del script. El propio
> deploy-web.sh imprime una línea con el comando exacto del rollback.

## Procedimiento automatizado (recomendado)

Desde Junio 2026 existe `scripts/rollback-web.sh`:

```bash
./scripts/rollback-web.sh              # rollback al previo + health check
./scripts/rollback-web.sh --check      # ver estado sin tocar nada
./scripts/rollback-web.sh --no-health-check   # rollback sin esperar restart
```

El script usa `bash -s` con heredoc (no inline command) — es **CageFS-friendly**.
Inline command falla con `exec request failed on channel 0` en Hostinger.

### Pre-flight
- SSH key en `~/.ssh/hostinger_clicktoeat` (o `SSH_KEY=ruta` env var)
- Debe existir `.next.previous` en el VPS (lo crea `deploy-web.sh` en cada deploy)

### Qué hace
1. Renombra `.next` → `.next.failed-<timestamp>` (preserva bundle roto)
2. Restaura `.next.previous` → `.next`
3. Mismo swap para `public` / `public.previous`
4. `touch tmp/restart.txt` (Passenger recarga)
5. Espera 8s y hace health check a `https://clicktoeat.lumiaaisolutions.com/`

### Exit codes
- `0` — rollback OK, health 200
- `1` — algo falló (sin `.next.previous`, SSH falló, etc.)
- `2` — rollback aplicado pero health no devuelve 200 (Passenger todavía arrancando, o el previo también roto)

---

## Procedimiento manual (si el script no existe o falla)

### Plan A — SSH interactivo

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72

# Una vez dentro:
cd ~/domains/clicktoeat.lumiaaisolutions.com/nodejs

# Verifica que existe .next.previous
ls -la | grep -E "next|public"

# Si existe, hacer el swap:
rm -rf .next.failed public.failed
mv .next .next.failed
mv .next.previous .next
mv public .public-tmp
mv public.previous public
mv .public-tmp public.failed
touch tmp/restart.txt

exit
```

Después desde local:
```bash
sleep 10 && curl -sI https://clicktoeat.lumiaaisolutions.com/ | head -3
# Esperado: HTTP/2 200
```

### Plan B — hPanel File Manager (cuando SSH está rate-limited)

1. https://hpanel.hostinger.com/ → Hosting → clicktoeat → File Manager
2. Navega: `domains/clicktoeat.lumiaaisolutions.com/nodejs/`
3. Right-click → Rename:
   - `.next` → `.next.failed`
   - `.next.previous` → `.next`
   - `public` → `public.broken`
   - `public.previous` → `public`
   - `public.broken` → `public.failed`
4. Entra a `tmp/` → si existe `restart.txt`, right-click → Touch. Si no, crear archivo vacío llamado `restart.txt`.
5. Espera 30s y refresca `https://clicktoeat.lumiaaisolutions.com/`

---

## Gotchas conocidos (de la sesión 2026-06-19)

### "Connection reset by peer" + "exec request failed on channel 0"

CageFS de Hostinger **rechaza comandos inline largos** vía
`ssh host 'comando_largo_multi-línea'`. El sshd cierra la sesión antes del
shell startup.

**Soluciones**:
- Usar `ssh host 'bash -s' <<EOF ... EOF` (heredoc) — esto sí pasa.
- O `ssh interactivo` y ejecutar comandos uno por uno.
- Lo nuestros scripts usan el patrón heredoc.

### "Connection reset by peer" en TODOS los SSH

Probablemente **fail2ban / rate-limit por intento fallido** de SSH desde tu IP.
Reintentos repetidos extienden el ban. **Espera 30-60 min sin tocar nada**.
Mientras tanto puedes usar hPanel File Manager.

### Sitio cae con `pthread_create: Resource temporarily unavailable`

NO es rollback. Es **NPROC limit del plan Hostinger**. Ver
[`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md)
y [`docs/infra/passenger-node-tuning.md`](../infra/passenger-node-tuning.md).

---

## Después de un rollback exitoso

1. Confirma health: `curl -sI https://clicktoeat.lumiaaisolutions.com/`
2. Smoke manual en navegador (admin login + acción cualquiera).
3. **Recoge logs del bundle roto** para diagnóstico:
   ```bash
   ssh ... 'tail -200 ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/stderr.log'
   ssh ... 'tail -200 ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/console.log'
   ```
4. NO redeployar sin entender la causa raíz del crash.
5. El bundle roto queda en `.next.failed-<timestamp>` por una semana, puedes
   inspeccionarlo via SSH.
