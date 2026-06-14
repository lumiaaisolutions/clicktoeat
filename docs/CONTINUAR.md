# Cómo continuar el proyecto en otra sesión

> Snapshot al **2026-06-14**. Si abres el proyecto en una sesión nueva
> (otro día, otra máquina, otro dev), lee este archivo primero.

## Estado actual del sistema

**Sistema en producción y funcionando:**

| Capa | URL | Estado |
|------|-----|--------|
| Frontend público | https://clicktoeat.lumiaaisolutions.com | ✅ Up |
| API | https://clicktoeat-api.lumiaaisolutions.com | ✅ Up |
| BD | MySQL managed en VPS | ✅ Up |
| Hosting | Hostinger VPS con CageFS | ✅ Up |

**Health checks:**
```bash
curl -I https://clicktoeat.lumiaaisolutions.com/        # 200
curl -I https://clicktoeat-api.lumiaaisolutions.com/up  # 200
```

## ¿Por dónde voy?

### ✅ Cerrado en sesión 2026-06-14 (hoy)

- **Rediseño editorial cálido de la landing del local** (`/[slug]`):
  hero 76vh con Instrument Serif, info card flotante con status pulse,
  chips horizontales de categorías, grid de cards de productos (volvió
  el grid, dejó el accordion), cart FAB con sheen+ring, checkout sheet
  con form completo. Bundle bajó de 31 kB a 16.8 kB. Tipografía nueva:
  `.ce-serif` (Instrument Serif) + `.ce-body` (Hanken Grotesk) cargadas
  en `layout.tsx`. 11 keyframes nuevos en `globals.css`. Ver
  [`frontend/landing.md`](frontend/landing.md) y
  [`frontend/typography.md`](frontend/typography.md).
- Eliminado input "Notas (opcional)" del checkout (no se enviaba al
  backend, era engañoso).
- **Vista móvil del local más densa**: cards `grid-cols-2`, imagen 1/1,
  paddings/tipografía reducidos, descripción oculta en mobile (visible
  en el detail sheet). En `sm+` se mantiene el diseño anterior intacto.
- **Home `/` con copy condensado**: Hero, Why, System, CTAOwner y QR
  con titulares y descripciones más breves (6-9 palabras por título,
  1 línea por body).
- **Nuevo `PinnedFoodStory`** (`components/landing/PinnedFoodStory.tsx`):
  3 frames con foto real (Unsplash) + texto cycling controlado por
  `scrollYProgress`. Imagen sticky con cross-fade entre frames + progress
  bar inferior. Reemplaza a `ScrollPhoneSequence` (legacy, queda en
  repo). Bundle `/` baja de 19.3 → 17.5 kB.

### ✅ Cerrado en sesión 2026-06-12 al 2026-06-13

- Sistema multi-tenant funcionando con dos locales reales
  (`postres-stitch`, `pizza-bambino`).
- Rediseño completo de la landing pública (BurgerSequence con 168 frames,
  ScrollPhone, WhyClickToEat, SystemPreview, footer con LUMIA, accordion
  de productos, banner premium cerrado).
- Rediseño del directorio público con tilt 3D + spotlight + cards modernas.
- Permisos granulares de staff (12 módulos, 4 presets, IconPicker visual).
- IconSystem con ~50 iconos food-focused.
- Sistema de loaders branded (InitialLoader + RouteTransition + RSC).
- Plan SaaS completo documentado (ADR-011 + features + runbooks).
- Deploy automatizado fixed (BSD tar, rutas correctas, excludes para uploads).
- Hosting auditado y documentado correctamente (VPS+CageFS, no Shared).

### 🟡 Pendiente operativo — TÚ haces antes de Fase 11 SaaS

Necesario para que arranquemos la implementación del cobro mensual:

| # | Tarea | Tiempo | Runbook |
|---|-------|--------|---------|
| 1 | Configurar Stripe Dashboard (3 productos + webhook + portal) | 45 min | [`runbook/configurar-stripe.md`](runbook/configurar-stripe.md) |
| 2 | Configurar MAIL en Hostinger Email | 30 min | [`runbook/setup-mail-hostinger.md`](runbook/setup-mail-hostinger.md) |
| 3 | Cron del scheduler en hPanel (1 línea) | 5 min | [`runbook/setup-cron-scheduler.md`](runbook/setup-cron-scheduler.md) |

**Cuando termines los 3 anteriores, mándame estas 9 variables del `.env`:**

```
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ESSENTIAL=
STRIPE_PRICE_PROFESSIONAL=
STRIPE_PRICE_PREMIUM=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
```

Con esas variables arranco Fase 11.1 (modelo + Stripe SDK) inmediatamente.

### 🟢 Fase 11 — SaaS (no iniciada, plan completo documentado)

**13 días dev en 10 fases independientes** — ver
[`features/saas-billing.md`](features/saas-billing.md) y
[`decisions/ADR-011-saas-pricing-and-feature-gating.md`](decisions/ADR-011-saas-pricing-and-feature-gating.md).

3 planes (decididos):
- **Esencial $99 MXN/mes** — catálogo + WhatsApp + branding básico.
- **Profesional $299 MXN/mes** — + inventario, recetas, métricas, staff (3 máx).
- **Premium $499 MXN/mes** — + POS, métricas avanzadas, audit log, staff ilimitado.

Trial: 14 días sin tarjeta (decidido).

### 🔴 Pendientes técnicos menores (post-SaaS)

1. **Backup off-site de uploads** — `scripts/backup-mysql.sh` extender para
   subir `storage/app/public/uploads/` a B2 vía rclone. Ver
   [`runbook/recuperar-uploads-perdidos.md`](runbook/recuperar-uploads-perdidos.md)
   sección "Backup de uploads off-site (TODO)".
2. **35 failures de PHPUnit** del API — son de tests legacy, no afectan
   runtime productivo. Revisar cuando hagamos pasada de calidad técnica.
3. **Tests del sistema de permisos** — `StaffPermisosTest` no se escribió.
4. **Middleware `EnsurePermiso`** — hoy depende de policies y revisión manual.
   Cerrar gap antes de Fase 11.
5. **UptimeRobot** apuntando a `/up` (API) y `/` (Web). Antes del primer
   cliente pagado.
6. **Theme toggle del landing del local** no persiste — alterna sol/luna
   solo durante la visita. Agregar `localStorage.setItem('ce-theme', …)`
   en `LandingClient` si decidimos que vale la pena (decision pendiente).
7. **Variantes/extras de productos en `ProductDetailSheet`** — hoy se
   ignora `producto.extras` y siempre se agrega sin extras seleccionados.
   Bloqueante cuando un local active recetas con grupos opcionales.
8. **Notas globales del pedido** — el campo se removió del checkout
   porque el backend solo acepta `notas` por item. Si se quiere
   reintroducir, agregar columna `pedidos.notas` + payload + UI.
9. **Partir `LandingClient.tsx` (~30 KB)** en sub-componentes
   (Hero, InfoCard, Categorias, ProductGrid, etc.) cuando toque tocarlo
   de nuevo. Hoy es legible pero el archivo está grandote.

## Cómo retomar — checklist al abrir el repo

```bash
# 1. Verificar que estás en main al día con remote
cd ~/Desktop/LUMIA/clicktoeat
git fetch && git status                # should be: "On branch main, up-to-date with origin/main"
git log --oneline -10                   # ver últimos commits

# 2. Health check de producción
curl -s -o /dev/null -w "%{http_code}\n" https://clicktoeat.lumiaaisolutions.com/        # 200
curl -s -o /dev/null -w "%{http_code}\n" https://clicktoeat-api.lumiaaisolutions.com/up  # 200

# 3. Verificar SSH al servidor
ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 'echo OK'

# 4. (Opcional) Levantar dev local
cd apps/web && npm run dev               # http://localhost:3000
# El .env.local apunta a https://clicktoeat-api.lumiaaisolutions.com (datos reales)
```

## Convenciones críticas (no romper)

- **Multi-tenancy**: nunca `DB::table('productos')`, siempre `Producto::query()`.
  El `TenantScope` global filtra por `local_id` del `TenantContext` singleton.
- **Docs**: cada tema vive en su propio `.md` dentro de la carpeta temática
  (`docs/<carpeta>/`). NO consolidar temas distintos.
- **Iconos**: NO usar emojis. Siempre `<Icon name="..." />` del sistema en
  `components/ui/Icon.tsx`.
- **Hosting es VPS+CageFS** (no Shared como decía la doc original).
  Limitaciones: sin sudo, sin crontab, sin apt. Crons via hPanel.
- **`.htaccess` críticos** (no borrar, no `touch` simple):
  - `apps/api/.htaccess` — redirige a `public/$1`
  - `apps/api/public/.htaccess` — rewrite a `index.php`
- **Uploads** viven en `storage/app/public/uploads/` con symlink
  `public/storage` → `../storage/app/public`. Excluidos del rsync.

## Quick reference de docs

| Necesito... | Lee... |
|-------------|--------|
| Setup local | [`infra/local-setup.md`](infra/local-setup.md) |
| Cómo deployar | [`infra/deploy-hostinger.md`](infra/deploy-hostinger.md) |
| Estructura del repo | [`architecture/overview.md`](architecture/overview.md) |
| Cómo agregar un feature | [`contributing/how-to-add-feature.md`](contributing/how-to-add-feature.md) |
| Sistema de iconos | [`frontend/icon-system.md`](frontend/icon-system.md) |
| Permisos de staff | [`features/staff-permissions.md`](features/staff-permissions.md) |
| Plan SaaS | [`features/saas-billing.md`](features/saas-billing.md) |
| Configurar Stripe (paso a paso) | [`runbook/configurar-stripe.md`](runbook/configurar-stripe.md) |
| Recuperar uploads borrados | [`runbook/recuperar-uploads-perdidos.md`](runbook/recuperar-uploads-perdidos.md) |
| Cambio histórico | [`../CHANGELOG.md`](../CHANGELOG.md) |

## Deploy rápido

```bash
cd ~/Desktop/LUMIA/clicktoeat

# Solo frontend
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy-web.sh

# Solo API
SSH_KEY=~/.ssh/id_ed25519 ./scripts/deploy-api.sh --skip-tests

# Verificar después
curl -I https://clicktoeat.lumiaaisolutions.com/
curl -I https://clicktoeat-api.lumiaaisolutions.com/up
```

## Si algo se rompe en prod

0. **Frontend con HTTP 503 tras deploy** (Passenger arranca con
   `pthread_create: Resource temporarily unavailable`): hay procesos
   `next-server` huérfanos acumulados. Solución:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 '
   pkill -9 -f "next-server"
   sleep 3
   cd /home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs
   touch tmp/restart.txt
   '
   sleep 10
   curl -s -o /dev/null -w "%{http_code}\n" https://clicktoeat.lumiaaisolutions.com/  # 200
   ```
   Esto pasa cuando hay >5 deploys en un día. CageFS tiene límite bajo de
   procesos por usuario. Pasa fácil en sesiones intensas — el código no
   tiene nada que ver.

1. **Frontend caído**: rollback rápido
   ```bash
   ssh -i ~/.ssh/id_ed25519 -p 65002 u221820910@86.38.202.72 '
   cd /home/u221820910/domains/clicktoeat.lumiaaisolutions.com/nodejs
   rm -rf .next public
   mv .next.previous .next && mv public.previous public
   touch tmp/restart.txt
   '
   ```
2. **API caído con 404 en TODO**: probablemente `.htaccess` raíz se borró.
   Restaurar con:
   ```bash
   ssh ... "cat > /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html/.htaccess << 'EOF'
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteRule ^(.*)\$ public/\$1 [L]
   </IfModule>
   EOF"
   ```
3. **Imágenes desaparecidas**: ver [`runbook/recuperar-uploads-perdidos.md`](runbook/recuperar-uploads-perdidos.md).
4. **BD corrupta o llena**: ver [`runbook/bd-llena.md`](runbook/bd-llena.md) y
   [`runbook/restaurar-backup-mysql.md`](runbook/restaurar-backup-mysql.md).

## Credenciales productivas (para emergencia)

- SSH key: `~/.ssh/id_ed25519` (autorizada). Alternativa: `~/.ssh/hostinger_clicktoeat`.
- Panel: https://hpanel.hostinger.com → VPS 1698236.
- BD: en `.env` del servidor productivo. NO en repo.
- Demo accounts (en BD seedeada):
  - `admin@ClickToEat.app` / `password123` (super_admin)
  - `owner+postres-stitch@ClickToEat.app` / `password123` (owner del local real)

---

**Última actualización**: 2026-06-14 — sesión Rediseño editorial cálido del
landing del local + mobile compacto (grid 2 cols con cards densas) + home
con copy condensado y nueva sección `PinnedFoodStory` (imagen sticky con
cross-fade entre 3 frames de foto real).
