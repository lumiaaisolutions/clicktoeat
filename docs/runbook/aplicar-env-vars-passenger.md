# Aplicar env vars a la app Node.js en Passenger (Hostinger)

> Dos caminos para configurar variables de entorno del Node server en
> el VPS Hostinger. Útil tras el outage NPROC del 2026-06-19 o cualquier
> ajuste futuro de runtime (Sentry, Stripe, etc.).

## Camino A — hPanel UI (oficial, lento)

1. https://hpanel.hostinger.com/ → Hosting → `clicktoeat.lumiaaisolutions.com` → Manage
2. Click en módulo **Node.js**
3. Selecciona la app activa
4. Sección **Environment variables** → **Add Variable**
5. Save → **Restart** la app

Pros: oficial, persistente en panel database.
Contras: 5 minutos de clicks, no versionable, requiere login + 2FA.

## Camino B — `Passengerfile.json` via SSH (rápido, versionable)

Passenger lee env vars de `~/domains/<dominio>/nodejs/Passengerfile.json`
al boot del proceso. Editarlo directamente es más rápido que hPanel y
queda como artefacto en el FS del VPS (sobrevive a redeploys que
preservan la carpeta `nodejs/`).

### Procedimiento

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
```

Adentro:

```bash
cat > ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/Passengerfile.json <<'EOF'
{
  "envvars": {
    "UV_THREADPOOL_SIZE": "2",
    "NODE_OPTIONS": "--max-old-space-size=512",
    "NEXT_TELEMETRY_DISABLED": "1"
  }
}
EOF

# Confirmar contenido
cat ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/Passengerfile.json

# Restart Passenger (sin esto Passenger sigue con env vars viejas)
touch ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/tmp/restart.txt

exit
```

Verificar desde local que el sitio sigue 200:

```bash
sleep 10 && curl -sI https://clicktoeat.lumiaaisolutions.com/ | head -3
```

### Verificar que el proceso Node tomó las env vars

(Opcional, requiere SSH otra vez)

```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72
ps -ef | grep 'node.*server.js' | grep -v grep
# Anota el PID
cat /proc/<PID>/environ | tr '\0' '\n' | grep -E 'UV_THREADPOOL|NODE_OPTIONS|TELEMETRY'
```

Si ves las 3 vars, Passenger las cargó correctamente.

## Cuándo usar cuál

| Escenario | Camino |
|---|---|
| Una sola var, una sola vez | A (hPanel UI) |
| Múltiples vars o cambios frecuentes | B (Passengerfile.json) |
| Automatizar via deploy script | B + `deploy-web.sh` lo crea/preserva |
| Var con secrets sensibles | A (hPanel encripta en su DB) o B con `chmod 600` del archivo |

## Gotchas

- **`UV_THREADPOOL_SIZE` y `NODE_OPTIONS` deben estar antes del boot**.
  No sirve setearlas en runtime via `process.env.X = ...` — node ya
  inicializó libuv y V8. Passengerfile.json las inyecta al exec — correcto.
- **`Passengerfile.json` se preserva entre deploys** (`deploy-web.sh`
  rsynca `.next/standalone + .next/static + public`, NO toca `nodejs/`).
  Pero ten respaldo del contenido en `docs/infra/passenger-node-tuning.md`
  por si se borra.
- **`touch tmp/restart.txt` no es opcional** — Passenger no detecta
  cambios en Passengerfile.json hasta el siguiente reboot del worker.
- **Si la app no arranca tras tocar Passengerfile.json**: el JSON puede
  estar mal formado. Verifica con:
  ```bash
  python3 -m json.tool < Passengerfile.json
  ```
  o restaura con:
  ```bash
  rm ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/Passengerfile.json
  touch ~/domains/clicktoeat.lumiaaisolutions.com/nodejs/tmp/restart.txt
  ```

## Referencias

- Outage NPROC que motivó esto: [`docs/issues/2026-06-19-outage-frontend-nproc.md`](../issues/2026-06-19-outage-frontend-nproc.md)
- Tuning detallado de Node bajo Passenger: [`docs/infra/passenger-node-tuning.md`](../infra/passenger-node-tuning.md)
- Passenger docs: https://www.phusionpassenger.com/library/config/standalone/reference/
