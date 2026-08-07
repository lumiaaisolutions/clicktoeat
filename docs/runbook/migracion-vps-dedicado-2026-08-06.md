# Runbook — Migración de clicktoeat + clicktoshop a VPS dedicado (2026-08-06)

> Documento vivo. Se actualiza en cada fase conforme se ejecuta la migración.

## Por qué

`clicktoeat` y `clicktoshop` viven hoy en el plan **"Business Web Hosting"**
de Hostinger (host `86.38.202.72`), que reparte su cupo de recursos de 24h
entre **13 sitios de la misma cuenta**. El 2026-08-06 el cupo llegó a 100%
y tumbó `clicktoshop` (503 en API, timeout en web) mientras `clicktoeat`
seguía respondiendo — el fallo es a nivel de cuenta compartida, no de
código. Ya se usó el "Resource Boost" gratuito el día anterior (2026-08-05)
para un incidente similar — no es una solución repetible a diario.

La cuenta tiene un **VPS dedicado ya pagado y casi sin uso**:
`vps/1698236` (`srv1698236.hstgr.cloud`, IP `2.24.123.93`, plan KVM 2,
Ubuntu 24.04 LTS, root SSH, expira 2026-08-23). Al momento de decidir la
migración: 3% CPU, 22% RAM, 27/100 GB disco. Nada compartido con otras
cuentas — mover ambos proyectos aquí elimina el modo de falla de cuota
compartida por completo.

**Decisión (2026-08-06, con el usuario)**: migrar ambos proyectos al VPS
ahora. Aún no hay datos reales de negocio más que un local — ventana de
riesgo baja, mejor momento para hacerlo que más adelante.

## Estado de origen (referencia, host viejo)

| | clicktoeat | clicktoshop |
|---|---|---|
| Web | clicktoeat.lumiaaisolutions.com | clicktoshop.lumiaaisolutions.com |
| API | clicktoeat-api.lumiaaisolutions.com | clicktoshop-api.lumiaaisolutions.com |
| Host | 86.38.202.72:65002 (SSH) | 86.38.202.72:65002 (SSH, misma cuenta) |
| BD | `u221820910_clicktoeat` | (ver Fase 0) |

## Destino

| | Valor |
|---|---|
| VPS | `srv1698236.hstgr.cloud` (hostname interno: `lumia-prod`) |
| IP | `2.24.123.93` |
| SSH | `ssh -p 8080 root@2.24.123.93` (root real, sin CageFS — **puerto 8080, NO 22**) |
| OS | Ubuntu 24.04 LTS |
| Plan | KVM 2 |

### ⚠️ Hallazgo importante (Fase 0): esta VPS NO está vacía

No es un VPS libre — es la VPS compartida donde ya corren otros productos
de LUMIA en producción:

- **PM2** (usuario `deploy`, `~/.pm2`): `lumia-hq` (puerto 3001),
  `lumia-portal` (3002), `lumina-restaurante` (3003).
- **Docker**: `tradetrove-backend-1`, `tradetrove-db-1`,
  `tradetrove-db_backup-1`, `n8n` (5678), `ollama` (11434).
- **Nginx** ya sirve: `api.lumiaaisolutions.com`,
  `app.clicktotrade.lumiaaisolutions.com`,
  `clicktotrade.lumiaaisolutions.com`, `intranet.lumiaaisolutions.com`,
  `lumina.conf`, `lumina-api.conf`, `portal.lumiaaisolutions.com`.
- Stack base **ya instalado y corriendo**: PHP 8.4.22-fpm (activo),
  MySQL 8.0.46 (activo, `127.0.0.1:3306`), Postgres (contenedor Docker),
  Node vía nvm bajo el usuario `deploy`.

**Implicación**: no hay que instalar el stack desde cero (Fase 2 se
reduce a "configurar", no "instalar"). Sí hay que seguir la convención ya
establecida (usuario `deploy`, PM2, puertos libres siguientes: 3004/3005)
y tener cuidado de no tocar nada de `lumia-hq`/`lumia-portal`/
`lumina-restaurante`/`tradetrove`/`n8n`/`ollama` — son sistemas en vivo de
otros productos, ajenos a esta migración.

## Fases

- [x] **Fase 0** — Preflight: verificar accesos, inventariar BD/.env reales.
- [x] **Fase 1** — Respaldos (BD + uploads + .env) — local.
- [x] **Fase 2** — Setup base del VPS. Stack ya existía (PHP 8.4-fpm, MySQL 8, Node 20, Nginx, PM2, certbot) — solo faltó `php8.4-mysql` (instalado) y crear `/var/www/clicktoeat/` + `/var/www/clicktoshop/`.
- [x] **Fase 3** — Bases de datos restauradas y verificadas (64 y 45 tablas, datos reales confirmados).
- [x] **Fase 4** — API + Web de ambos proyectos desplegados y corriendo.
- [x] **Fase 5** — Validado por HTTP directo contra la IP del VPS (`--resolve`, sin tocar DNS).
- [ ] **Fase 6** — Cutover de DNS + SSL — **pausada** (2026-08-06), ver hallazgo crítico abajo. Retomar desde aquí.
- [ ] **Fase 7** — Post-migración: actualizar scripts/docs, decidir qué hacer con el host viejo (pausar, no borrar, por rollback).

## Fase 6 — hallazgo crítico: clicktoeat/clicktoshop NO usan DNS tradicional (2026-08-06)

Al intentar cambiar los A records de `clicktoeat`, `clicktoeat-api`, `clicktoshop`,
`clicktoshop-api` en hPanel → Domains → DNS/Nameservers → DNS records, **ninguno
de los 4 subdominios aparece en la zona** (búsqueda "clicktoeat"/"clicktoshop" →
"Nothing found"; solo aparecen otros sitios de la cuenta como `clicktobarber`,
`clicktotrade`, `intranet`, etc., con A records normales).

**Por qué**: `clicktoeat.lumiaaisolutions.com` (y presumiblemente los otros 3) no
corren en el hosting compartido tradicional vía un A record simple — corren en el
producto **"Node.js App Hosting"** propio de Hostinger (panel tipo Vercel):
`hpanel.hostinger.com/websites/clicktoeat.lumiaaisolutions.com` muestra
"Deployments", "Environment variables", "Runtime logs", framework Next.js,
node 20.x, último deploy `clicktoeat-frontend.tar.gz`, con badges "SSL" y **"CDN"**.

`dig clicktoeat.lumiaaisolutions.com A` devuelve IPs anycast sin PTR
(`77.37.76.102`, `148.135.128.234`) con TTL de 10-30s — típico de un CDN edge, no
del origen real. **Pero el origen real detrás de ese CDN SÍ es el mismo host de
siempre**: en Hosting Plan → Plan Details de ese mismo "website" de Node Hosting,
`Website IP address: 86.38.202.72` — el mismo host compartido con cupo agotado.

**Conclusión**: no hay un tercer servidor oculto. Es el mismo `86.38.202.72` de
siempre, pero Hostinger le puso un panel de Node App Hosting + CDN encima en
algún punto (probablemente automático al detectar un despliegue Next.js), que
oculta el A record tradicional dentro de su propio mecanismo de gestión de
dominio. Cambiar el DNS del dominio requiere primero **desvincular
`clicktoeat.lumiaaisolutions.com` (y los otros 3) de ese producto de Node App
Hosting** — no se encontró todavía dónde se hace eso sin arriesgar el sitio en
vivo, y no se intentó nada más allá de explorar (sin cambios aplicados).

### Para retomar

1. Buscar en el dashboard de cada "website" de Node App Hosting
   (`hpanel.hostinger.com/websites/<dominio>`) una opción de tipo "Remove domain" /
   "Disconnect" / "Use custom hosting" — revisado `Domains → Subdomains` (no es
   eso) y `Hosting Plan → Plan Details` (muestra IP pero no opción de desvincular).
   Faltan por revisar: `Deployments`, `Environment variables`, `Advanced`.
2. Alternativa más segura: contactar soporte de Hostinger y preguntar
   específicamente "cómo apunto clicktoeat.lumiaaisolutions.com a una IP externa
   (2.24.123.93) en vez del Node.js App Hosting actual" — evita adivinar en un
   panel no documentado mientras el sitio está en producción.
3. Una vez desvinculado, el resto del plan de Fase 6 sigue igual: A records → IP
   del VPS (2.24.123.93), esperar propagación, `certbot` para los 4 dominios,
   validar por HTTPS real.
4. **El VPS nuevo ya tiene todo listo y verificado (Fases 0-5)** — no hay
   apuro ni riesgo en esta pausa. El sitio sigue funcionando normalmente en el
   host viejo hasta que se decida el cutover.

## Estado del deploy en el VPS (2026-08-06, completo hasta Fase 5)

| | clicktoeat | clicktoshop |
|---|---|---|
| API | `/var/www/clicktoeat/api` — Laravel, composer install OK, migrate:status OK, config/route/view cacheados | `/var/www/clicktoshop/api` — igual |
| BD | `u221820910_clicktoeat` (64 tablas) | `u221820910_clicktoshop` (45 tablas) |
| Web | `/var/www/clicktoeat/web` — Next.js standalone, PM2 `clicktoeat-web` puerto **3004** | `/var/www/clicktoshop/web` — PM2 `clicktoshop-web` puerto **3005** |
| Nginx | `clicktoeat.lumiaaisolutions.com` + `clicktoeat-api.lumiaaisolutions.com` (HTTP, sin SSL aún) | `clicktoshop.lumiaaisolutions.com` + `clicktoshop-api.lumiaaisolutions.com` (igual) |

Verificado por HTTP directo (`curl --resolve <dominio>:80:2.24.123.93 ...`, sin tocar DNS real):
- `/up` de ambas APIs → 200.
- Endpoint público de menú con datos reales (`postres-stitch`, `betle`/LEBE) → 200 con JSON correcto.
- `/login` de ambos paneles admin → 200.
- Imagen de producto subida (`storage/uploads/...`) → 200 (confirma `storage:link` + uploads restaurados OK).
- `pm2-deploy.service` habilitado → los 2 procesos nuevos sobreviven un reboot del VPS.

**Nota**: la validación de flujos con sesión (login real, Sanctum) requiere HTTPS real — eso se prueba después del cutover de DNS + certbot (Fase 6), no es posible completo en HTTP-only.

### Incidentes durante Fase 4

- `php8.4-mysql` no estaba instalado (el VPS se armó para apps con Postgres). Se instaló vía `apt`
  — el post-install `needrestart` reinició automáticamente `lumia-queue.service` y
  `lumina-restaurante-queue.service` (dependencia compartida de libs). Verificado
  después: ambos `active`, PM2 de los 3 apps existentes sin cambios.
- Se reinició `php8.4-fpm` (con confirmación explícita del usuario, por ser pool
  compartido con `api.lumiaaisolutions.com`) para cargar la extensión nueva.
  Verificado después: `api.lumiaaisolutions.com` sigue respondiendo con normalidad.
- Bug propio al empaquetar el build de `clicktoshop-web`: el `cp -r .next/standalone/*`
  no copia archivos/carpetas ocultos (`.next` interno del standalone empieza con
  punto) — el primer intento de PM2 falló con "Could not find a production build".
  Corregido usando `cp -r .next/standalone/. destino/` (el `/.` sí incluye ocultos).

## Estado de la Fase 1 — respaldos (completo, 2026-08-06)

El host viejo (86.38.202.72:65002) tenía SSH caído durante toda la
migración (mismo incidente de cuota de recursos). Los respaldos se
hicieron **sin SSH**, vía hPanel (File Manager + phpMyAdmin del sitio),
que sí funcionaban:

| Archivo | Tamaño | Método |
|---|---|---|
| `clicktoeat-api.env` | 2.1 KB | File Manager → descarga directa |
| `clicktoshop-api.env` | 2.7 KB | File Manager → descarga directa |
| `u221820910_clicktoeat.sql` | 176 KB | phpMyAdmin → Export → Quick/SQL |
| `u221820910_clicktoshop.sql` | 307 KB | phpMyAdmin → Export → Quick/SQL |
| `clicktoeat-storage-app-public.tar.gz` | 12 MB | File Manager → descarga carpeta `storage/app/public` como tar.gz |
| `clicktoshop-storage-app-public.tar.gz` | 180 B | Igual — vacío, clicktoshop aún no tiene uploads reales |

Guardados en `_migracion-backups-2026-08-06/` en la raíz de `ClickTo/`
(fuera de ambos repos — no se commitea, contiene secretos: Stripe live
keys, Gemini API key, password de BD, SMTP). **Pendiente**: subir copia
redundante al VPS nuevo (parte original del plan de Fase 1) — no se hizo
porque requería el acceso SSH que quedó a medias (ver abajo).

## Acceso SSH al VPS — resuelto (2026-08-06)

**Root NO tiene login SSH permitido** — hardening deliberado en
`/etc/ssh/sshd_config.d/99-lumia-hardening.conf`: `AllowUsers deploy`.
Cualquier intento de `ssh root@...` falla con "not allowed because not
listed in AllowUsers", sin importar qué llave se use — esto no tiene
relación con el problema de la llave corrupta (ver abajo), son dos cosas
distintas que se confundieron durante el diagnóstico.

**Conexión correcta**:

```bash
ssh -i ~/.ssh/id_ed25519 -p 8080 -o IdentitiesOnly=yes deploy@2.24.123.93
sudo -n whoami   # → root (sudo sin contraseña ya configurado para deploy)
```

- Puerto SSH: **8080**, no 22.
- El usuario `deploy` **ya tenía mi llave pública autorizada** de antes
  (mismo patrón que usan lumia-hq/lumia-portal/lumina-restaurante) y
  pertenece al grupo `sudo` con acceso passwordless — no hizo falta
  agregar nada ahí.
- La llave que sí se corrompió (concatenada sin salto de línea junto a
  `santiagoenriquez@192`) fue en `/root/.ssh/authorized_keys` — irrelevante
  ahora que la conexión real es por `deploy`, pero se dejó corregida de
  todas formas (solo append de una copia limpia al final, sin tocar ni
  borrar la línea de `santiagoenriquez@192` ni la `hostinger-managed-key`
  preexistentes).
- Durante el diagnóstico hubo además una caída total de red **local** del
  usuario (~15 min, gateway sin responder) que se solapó y complicó el
  troubleshooting — no relacionada con el VPS ni con Hostinger.

## Rollback

Mientras no se complete la Fase 6, el host viejo (`86.38.202.72`) sigue
siendo el origen de verdad — la migración corre en paralelo sin tocarlo.
Después de la Fase 6 (DNS apuntando al VPS nuevo), rollback = revertir los
A records al host viejo (que se deja pausado, no borrado, hasta confirmar
estabilidad del VPS nuevo por al menos unos días).
