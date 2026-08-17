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
- [x] **Fase 6** — Cutover de DNS + SSL — **completada** (2026-08-07). Los 4 subdominios (`clicktoeat`, `clicktoeat-api`, `clicktoshop`, `clicktoshop-api`) apuntan al VPS (`2.24.123.93`) y sirven HTTPS real con certificados Let's Encrypt válidos hasta 2026-11-05.
- [ ] **Fase 7** — Post-migración: actualizar scripts/docs, decidir qué hacer con el host viejo (pausar, no borrar, por rollback).

## Fase 6 — resuelto: el editor de DNS correcto está por subdominio, no en la zona general (2026-08-07)

El bloqueo documentado abajo (Node.js App Hosting/CDN sin A record editable) se
resolvió: el mecanismo correcto NO es el editor general de zona DNS
(`hpanel.hostinger.com/domain/<dominio>/dns` → tab "DNS records", donde buscar
"clicktoeat" da "Nothing found"), sino el editor **por subdominio**, accesible
desde `hpanel.hostinger.com/websites/<subdominio>` → Advanced → **DNS Zone
Editor**, que redirige a la misma pantalla de zona general pero con el tab
**"Subdomains"** preseleccionado y el subdominio ya elegido — ahí sí aparecen
sus registros reales:

```
ALIAS  @    clicktoeat.lumiaaisolutions.com.cdn.hstgr.net   300
CNAME  www  www.clicktoeat.lumiaaisolutions.com.cdn.hstgr.net  300
```

Es decir: el CDN/Node-hosting se implementa como un `ALIAS`/`CNAME` apuntando
al propio CDN de Hostinger (`*.cdn.hstgr.net`), no como una config opaca fuera
de DNS. No hace falta "desvincular" nada del producto Node Hosting — basta con
**borrar el `ALIAS`/`CNAME` y crear un registro `A` normal** apuntando al VPS.

**Gotcha de la API de Hostinger**: no se puede editar un `ALIAS` a `A` in-place
(error `"IN ALIAS must not be used with A on the same name"`, aunque sea el
mismo registro siendo reemplazado) — hay que **borrar primero, crear el `A`
después**, en dos pasos separados. Esto abre una ventana de segundos sin
resolución para ese nombre; aceptable dado el TTL bajo (300s) y que se hace
nombre por nombre, no de golpe.

**Procedimiento por subdominio** (repetir para cada uno de los 4):
1. `hpanel.hostinger.com/websites/<subdominio>` → Advanced → DNS Zone Editor.
2. Borrar el registro `ALIAS @` (o `CNAME <nombre>`) que apunta a `*.cdn.hstgr.net`.
3. Formulario "Add Record" arriba: `Type=A`, `Name=@` (o el nombre que corresponda), `Value=2.24.123.93`, `TTL=300` → Add Record.
4. Repetir para el `CNAME www` si existe (borrar + crear `A www → 2.24.123.93`).
5. Verificar con `dig +short <dominio> @1.1.1.1` (propaga en segundos con TTL 300) y `curl -sI http://<dominio>/` (HTTP, ya sirve desde el VPS).
6. `ssh deploy@2.24.123.93 "sudo certbot certonly --nginx -d <dominio> [-d www.<dominio>] --non-interactive --agree-tos -m nando.torres0987@gmail.com"` — con `certonly` (no `--nginx` como installer) el certificado se emite pero **no se instala** en el server block automáticamente.
7. `sudo certbot install --cert-name <dominio> --nginx --non-interactive` — si falla con `Could not automatically find a matching server block for www.<dominio>`, es porque el `server_name` del server block en `/etc/nginx/sites-available/<dominio>` no lista el alias `www` — agregarlo (`sed` o edición manual) y reintentar el install.
8. `sudo nginx -t && sudo systemctl reload nginx`, luego `curl -sI https://<dominio>/` para confirmar 200 con el certificado correcto (no el de `api.lumiaaisolutions.com`, que es el default del server block sin SSL propio).

**Los 4 subdominios completados con este procedimiento** (2026-08-07), todos
verificados HTTPS 200 real:

| Subdominio | Apex A | www A | Certificado | Verificado |
|---|---|---|---|---|
| `clicktoeat.lumiaaisolutions.com` | ✅ | ✅ | válido hasta 2026-11-05 | `curl -sI https://` → 200, sirve Next.js (`localhost:3004`) |
| `clicktoeat-api.lumiaaisolutions.com` | ✅ | n/a (API sin www) | válido hasta 2026-11-05 | `curl https://.../up` → 200 |
| `clicktoshop.lumiaaisolutions.com` | ✅ | ✅ | válido hasta 2026-11-05 | `curl -sI https://` → 200, sirve Next.js (`localhost:3005`) |
| `clicktoshop-api.lumiaaisolutions.com` | ✅ | n/a (API sin www) | válido hasta 2026-11-05 | `curl https://.../up` → 200 |

Auto-renovación gestionada por certbot (systemd timer, ya confirmado activo
en el VPS desde el setup previo). Los 2 dominios `-api` no llevan `www` — no
se usa ese subdominio para las APIs, así que sus `CNAME www → *.cdn.hstgr.net`
se dejaron intactos (apuntan al viejo CDN, pero nadie los resuelve en la
práctica; se pueden limpiar en Fase 7 si se quiere prolijidad).

**Fase 6 cerrada.** El host viejo (`86.38.202.72`) ya no recibe tráfico de
ninguno de los 4 dominios — sigue encendido intacto como rollback (ver
sección "Plan de rollback" más abajo) hasta confirmar estabilidad del VPS
nuevo por unos días. Pendiente real: validar flujos con sesión (login real,
Sanctum) sobre HTTPS real de producción — no se hizo en esta pasada, sólo se
verificaron health checks (`/up`) y carga de página. Eso es lo primero a
probar en Fase 7 antes de dar por definitivamente estable el corte.

## Fase 6 — hallazgo crítico (histórico, contexto del bloqueo original): clicktoeat/clicktoshop NO usan DNS tradicional (2026-08-06)

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

Fase 6 completada (2026-08-07) — el DNS de los 4 subdominios ya apunta al
VPS nuevo. El host viejo (`86.38.202.72`) se deja **pausado, no borrado**,
como rollback, hasta confirmar estabilidad del VPS nuevo por al menos unos
días. Procedimiento de rollback si hace falta volver: en
`hpanel.hostinger.com/websites/<subdominio>` → Advanced → DNS Zone Editor
(tab "Subdomains"), borrar el `A` que apunta a `2.24.123.93` y recrear el
`ALIAS @` / `CNAME www` hacia `<subdominio>.cdn.hstgr.net` (mecanismo
original de Node.js App Hosting). El host viejo no fue tocado en ningún
momento de la migración — sigue funcionando tal cual estaba.

## Incidente post-migración: build de producción con URL de API stale (2026-08-07)

Tras el cutover, ambos sitios (`clicktoeat` y `clicktoshop`) mostraban
**"Sin locales/tiendas disponibles"** en el directorio público, y el login
devolvía "No pudimos iniciar sesión" incluso con credenciales reales.

**Causa raíz**: el build de Next.js que quedó corriendo en el VPS (armado
durante la Fase 4/5 de la migración) se compiló **sin** la variable
`NEXT_PUBLIC_API_URL` disponible para los Server Components — el código
tiene un fallback `process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'`
(`apps/web/src/app/page.tsx`), y ese fallback quedó horneado en
`.next/server/app/page.js` (confirmado con `grep -c 'localhost:8080'`).
En runtime, el fetch server-side a `http://localhost:8080` golpeaba el
puerto SSH del propio VPS (`8080`) en vez de la API — el error en
`pm2 logs` mostraba literalmente `HPE_INVALID_CONSTANT` con el banner
`SSH-2.0-OpenSSH_9.6p1...` como respuesta, un síntoma confuso pero
inequívoco una vez identificado. El chunk **cliente** sí tenía la URL
correcta (por eso curl a la API funcionaba perfecto) — solo el server
chunk estaba mal, lo cual explica por qué el síntoma parecía "la API no
responde" cuando en realidad la API estaba sana.

**Fix**: re-build + redeploy con [`scripts/deploy-web.sh`](../../scripts/deploy-web.sh)
ya corregido (Fase 7), que exporta `NEXT_PUBLIC_API_URL` explícitamente
antes de `npm run build`. Verificado en ambos: `grep` en el nuevo
`page.js` ya no tiene `localhost:8080`, sí tiene la URL real de la API, y
el directorio público carga los locales/tiendas reales.

**Lección para futuros deploys manuales** (fuera de `deploy-web.sh`): si
se compila Next.js a mano durante una migración/emergencia, **siempre**
exportar `NEXT_PUBLIC_API_URL` en el shell antes de `npm run build`, no
asumir que `.env.production` alcanza — en este caso sí estaba committeado
correctamente, pero algo en el build manual de esa sesión no lo levantó
para el bundle server-side (no se determinó la causa exacta del builder
manual, pero el fix — usar el script en vez de build manual — la evita
de raíz).

## Incidente post-migración: uploads de ClickToShop no migrados (2026-08-07)

Las imágenes (logos/banners/productos) de ClickToShop no cargaban en
producción (ícono roto) tras el cutover, mientras que ClickToEat sí
mostraba sus imágenes normalmente.

**Causa raíz**: el backup de Fase 1 (`clicktoshop-storage-app-public.tar.gz`,
tomado ~17:46 del 2026-08-06) capturó el directorio de uploads **vacío**
(180 bytes, solo el header del tar) — en ese momento el negocio real
(LEBE, Bellísima Boutique) aún no tenía imágenes subidas. Entre ese
backup y el cutover de DNS (Fase 6, muchas horas después, ya 2026-08-07),
el host viejo **seguía siendo el origen real** — el dueño del negocio
subió sus logos/banners/fotos de producto ahí durante esa ventana
(confirmado por `Last-Modified: 2026-08-06 21:10` en el archivo real).
Al cortar el DNS al VPS, esas subidas nunca se sincronizaron — el VPS
solo tenía el snapshot vacío de las 17:46.

**Cómo se detectó**: el usuario reportó imágenes rotas específicamente en
ClickToShop tras recargar. Se comparó `find .../uploads -type f | wc -l`
entre ambos proyectos en el VPS: ClickToEat 33 archivos, ClickToShop 0.

**Cómo se recuperó** (SSH al host viejo seguía caído, mismo incidente de
cuota de recursos de siempre):
1. Se probó el archivo directo contra el origen real con
   `curl --resolve <dominio>:443:86.38.202.72` (bypass de DNS) → 200 OK,
   confirmando que el archivo SÍ existía en el host viejo pese a que el
   backup de Fase 1 no lo tenía.
2. Se usó el **File Manager de hPanel** (`Access files of
   clicktoshop-api.lumiaaisolutions.com`) para navegar a
   `public_html/public/storage/uploads/` — **no** `storage/app/public/uploads/`
   (el host viejo escribe directo ahí, sin symlink — ver nota en
   `docs/infra/deploy-hostinger.md`).
3. Se seleccionaron `banners/`, `logos/`, `productos/`, se comprimieron a
   `.tar.gz` (5.5 MB) desde el propio File Manager, y se descargaron al
   navegador local.
4. `scp` del tarball al VPS + extracción directa en
   `/var/www/clicktoshop/api/storage/app/public/uploads/` (con symlink
   correcto en destino) → verificado con `curl` HTTPS real → 200 OK.

**Verificado — sin gap de BD**: se comparó `COUNT(*)` y `MAX(updated_at)`
de `productos`, `pedidos`, `locales`, `categorias`, `users` entre el
MySQL real del host viejo (vía phpMyAdmin, conexión `127.0.0.1:3306` —
en vivo, no un snapshot) y el MySQL del VPS (vía `php artisan tinker`).
Los counts coinciden exactamente en las 5 tablas (ej. `productos: 3=3`,
`categorias: 3=3`, `users: 3=3`). La única discrepancia de timestamps
(`locales.max(updated_at)` 6 horas distinto) es simple diferencia de
timezone de display entre phpMyAdmin y `tinker`, no un gap real — y el
valor más reciente en el VPS (`2026-08-07 10:42:21`, ya después del
cutover) confirma que ediciones reales post-migración se están guardando
correctamente ahí. **Conclusión: la única pérdida real de la migración
fueron los archivos de uploads de ClickToShop (ya recuperados arriba) —
la base de datos no tuvo ningún gap.**

## Fase 7 — post-migración (2026-08-07, completada)

- **Scripts actualizados** para apuntar al VPS nuevo (host `2.24.123.93`,
  puerto `8080`, usuario `deploy`, paths `/var/www/<proyecto>/{api,web}`,
  restart via `pm2 restart <proyecto>-web` en vez de `passenger-config
  restart-app`): `deploy-api.sh`, `deploy-web.sh`, `rollback-web.sh` en
  ambos repos (clicktoeat y clicktoshop). `backup-mysql.sh` actualizado en
  el header (target VPS con cron real vía `crontab -e`, ya no hPanel →
  "Trabajos Cron") — la lógica de `mysqldump` en sí no cambió, ya era
  host-agnóstica.
- **`docs/infra/deploy-hostinger.md` reescrito completo** en ambos repos —
  la versión anterior describía el host viejo (Passenger, LiteSpeed, CageFS,
  `/home/u221820910/...`) de punta a punta; quedaba activamente engañosa
  para cualquiera (incluido un futuro Claude) que la leyera antes de tocar
  producción, que es justo lo que `CLAUDE.md` pide hacer primero.
- **Pendiente real, no cerrado en esta pasada**: validar un login completo
  con sesión (Sanctum) de un usuario de negocio real sobre el VPS nuevo. Se
  verificó que el stack completo responde correctamente (422 limpio en
  credenciales inválidas, no 500) y que la BD migrada tiene datos reales
  (7 usuarios, 4 locales en ClickToEat) — pero no se forzó un login exitoso
  porque no hay credenciales reales de negocio a mano y no correspondía
  adivinarlas.
- **Decisión sobre el host viejo**: se mantiene pausado (sin tráfico, sin
  tocar) como rollback. No se decidió aún si se da de baja o se reutiliza —
  eso queda para cuando se confirme la estabilidad del VPS nuevo, tema
  fuera del alcance de esta migración.

## Backup automático (2026-08-07, completado)

- **`backup-mysql.sh` adaptado a modo local-only** en ambos repos: el
  upload a Backblaze B2 (vía rclone) ahora es **opcional** — si
  `B2_REMOTE`/`B2_BUCKET` no están seteados, el script hace el dump,
  gzip -9, manifest con sha256, y retención local (14 días sin off-site vs
  3 con off-site), sin fallar por falta de cuenta B2. Antes el script
  exigía B2 con `${VAR:?required}`, bloqueando cualquier uso sin cuenta de
  terceros. Decisión explícita del usuario: **nada de pago**, y crear una
  cuenta B2 (aunque tenga free tier) está fuera de lo que Claude puede
  hacer por su cuenta (política de no crear cuentas de terceros).
- **Configurado y probado en el VPS**: `~/.config/{clicktoeat,clicktoshop}-backup.env`
  con las credenciales reales de cada `.env` de Laravel (permisos 600,
  escritos server-side sin que el password pasara por el transcript de
  Claude — el intento inicial de `grep`/`cat` sobre el `.env` fue bloqueado
  por el clasificador de seguridad, correctamente). Corrida manual de
  prueba en ambos: dump OK (28.8 KB clicktoeat, 32.8 KB clicktoshop).
- **Cron activado** vía `crontab -e` (sin tocar las líneas existentes de
  `lumia-hq-cron.sh`): `clicktoeat` a las 03:00 UTC, `clicktoshop` a las
  03:15 UTC, logs en `/var/www/<proyecto>/logs/backup.log`.
- **Pendiente real si se quiere off-site**: el usuario tendría que crear su
  propia cuenta Backblaze B2 (free tier, 10 GB) y setear `B2_REMOTE`/
  `B2_BUCKET` en los archivos de config — el script ya soporta ambos modos
  sin cambios adicionales.

## Host viejo — decisión final (2026-08-07)

Se investigó apagar el host viejo específicamente para clicktoeat/clicktoshop
(sin afectar los otros ~11 sitios que comparten esa cuenta de hosting —
`clicktobarber`, `clicktodo`, `gokonfirma`, etc.). Hallazgos:

- El dashboard de Node.js App Hosting (`hpanel.hostinger.com/websites/<dominio>`)
  **confirma por sí solo** que el DNS cutover funcionó: muestra el aviso
  *"Domain isn't connected to your website"* para `clicktoeat.lumiaaisolutions.com`
  — es decir, el host viejo ya no recibe tráfico real de ese dominio, pase
  lo que pase con el proceso Node interno.
- No existe un botón de "Stop" para el proceso — el dropdown de estado solo
  ofrece "Restart". La única forma de detenerlo del todo sería borrar el
  deployment, lo cual es difícil de revertir (perdería el rollback
  instantáneo documentado en la sección "Rollback" de este runbook).
- **Decisión del usuario, con la información anterior**: dejarlo tal cual.
  Ya está efectivamente desconectado del tráfico real (lo cual cumple el
  objetivo de "que solo trabaje el VPS"), y mantiene el rollback disponible
  sin costo adicional (la cuenta ya estaba pagada).

### Actualización (2026-08-07) — decommission ejecutado tras confirmar estabilidad

El usuario confirmó que todo funcionaba correctamente en el VPS y pidió dar
de baja el host viejo. Se borraron los 4 "Website" del hPanel compartido
(`clicktoeat.lumiaaisolutions.com`, `clicktoeat-api.lumiaaisolutions.com`,
`clicktoshop.lumiaaisolutions.com`, `clicktoshop-api.lumiaaisolutions.com`)
vía `Websites → ⋮ → Delete`. Los otros ~11 sitios de la cuenta no se
tocaron.

## Incidente: borrar el "Website" en hPanel también borró el DNS (2026-08-07)

**Síntoma**: ~15 min después del decommission de arriba, UptimeRobot marcó
los 4 monitores (ClickToEat Web/API, ClickToShop Web/API) como DOWN
simultáneamente.

**Causa raíz**: se asumió — incorrectamente — que "Delete Website" en el
hPanel del hosting compartido solo elimina el hosting (Node.js App Hosting
container, DB, archivos), sin tocar DNS, ya que el dominio raíz
(`lumiaaisolutions.com`) sigue gestionado por `ns1/ns2.dns-parking.com`
(Hostinger) independientemente del hosting real. **Falso**: al borrar el
"Website" del subdominio, Hostinger también eliminó su registro `A` en la
zona DNS. Confirmado con `dig <subdominio> @8.8.8.8` → sin respuesta (vs.
`dig lumiaaisolutions.com @8.8.8.8` → sí resolvía, confirmando que solo los
4 subdominios afectados perdieron su registro, no la zona completa).

**Fix**: recreados los 4 registros `A` en
`hpanel.hostinger.com/domain/lumiaaisolutions.com/dns` apuntando a
`2.24.123.93` (IP del VPS). Verificado:
- `dig <subdominio> @8.8.8.8` → `2.24.123.93` en los 4 casos.
- `curl --resolve <subdominio>:443:2.24.123.93 https://<subdominio>/...` →
  `200 OK` en los 4 casos (bypass de DNS, confirma que nginx/certbot en el
  VPS seguían intactos — el problema fue 100% DNS, no el servidor).

**Lección para futuros decommissions de "Website" en Hostinger shared
hosting**: si el dominio/subdominio ya fue migrado a otro servidor vía A
record manual, borrar el "Website" en hPanel puede arrastrarse también el
registro DNS aunque el hosting real esté en otro lado. Verificar
`dig <dominio> @8.8.8.8` inmediatamente después de cualquier "Delete
Website" que involucre un dominio con tráfico real, y no solo confiar en
que el cutover de DNS ya hecho es inmune a esto.
