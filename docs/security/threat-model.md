# Threat Model — ClickToEat

> Inventario de vectores de ataque. Para cada uno: control activo + gap + acción recomendada.

## Asumimos al atacante

- **Externo no autenticado**: navega la landing pública, intenta abusar `POST /public/pedidos/{slug}`.
- **Cliente legítimo malicioso**: cuenta de owner válida, intenta acceder a datos de otros locales.
- **Insider con SSH al servidor**: out of scope para este documento (es threat de la organización, no del software).

## Activos a proteger

- **Datos personales de clientes** (`pedidos`: nombre + teléfono + dirección).
- **Datos de negocio del owner** (productos, precios, recetas, métricas).
- **Disponibilidad** de landings públicas (el local pierde ventas si está caído).
- **Integridad de inventario** (descuento correcto sin filtraciones entre locales).
- **Credenciales** (passwords + tokens Sanctum).

---

## Vectores de ataque

### 1. Tenant leakage — un local ve datos de otro

**Severidad**: 🔴 Crítica. Sería un breach de privacidad cross-tenant.

**Vector**: bug en endpoint que olvida aplicar `local_id`, o `withoutGlobalScopes()` sin condicionar.

**Controles activos**:
- `App\Models\Concerns\BelongsToTenant` aplica `TenantScope` (GlobalScope) en cada modelo.
- `TenantContext` es **singleton** del container (sin singleton el scope no filtra).
- `EnforceTenantScope` middleware setea el contexto desde `$user->local_id`.
- Policies hacen segundo check: `$user->local_id === $resource->local_id`.
- Tests: `SuperAdminLocalesTest`, `InventarioAvanzadoTest`, `PedidoFlowTest` validan isolation.

**Gaps**:
- Sin **CHECK constraint a nivel BD** que valide `local_id` cuando el endpoint público crea un pedido (`POST /public/pedidos/{slug}`) — sólo el código lo garantiza.
- Endpoints públicos (`/public/menu/{slug}`) no pasan por `TenantScope`. Si alguien usa `DB::table(...)` allí, podría filtrarse data.
- No hay test específico de "endpoint público no expone datos cross-tenant" (los tests existentes cubren autenticados).

**Acción**:
- [ ] Añadir test del endpoint público que confirme que cambiar `producto_id` por uno de otro local en `POST /public/pedidos/{slug}` se rechaza (hoy se filtra en `OrderService::crear` via `where('local_id', $local->id)`).
- [ ] Periódicamente correr `grep -rn "withoutGlobalScopes\|withoutTenantScope\|DB::table" apps/api/app` y auditar cada match.

### 2. IDOR — owner accede a recurso por ID directo

**Severidad**: 🟠 Alta.

**Vector**: owner de Tacos cambia `/api/v1/pedidos/123` por `/pedidos/456` (un pedido de Pizza).

**Controles activos**:
- `TenantScope` filtra: la query `Pedido::find(456)` no devuelve nada porque el scope añade `WHERE local_id = <my_local_id>`.
- `findOrFail()` → 404.
- Adicionalmente `PedidoPolicy::view` chequea `$user->local_id === $pedido->local_id`.

**Gaps**:
- Si alguna ruta usa `withoutGlobalScopes()` sin policy, el IDOR pasa. Hoy no debería haber, validado por code review.

**Acción**:
- [ ] Test de IDOR explícito en cada policy nueva.

### 3. Brute-force de login

**Severidad**: 🟠 Alta. Compromiso de cuenta = compromiso del local.

**Vector**: atacante intenta passwords contra `POST /auth/login` masivamente.

**Controles activos**:
- `throttle:10,1` a nivel ruta (10 requests/min/IP).
- Guard manual en `AuthController::login` — 5 intentos por `IP+email`, 60s decay. 429 con `Retry-After`.
- Bcrypt para hash (`password` cast `hashed` en User).

**Gaps**:
- **Sin captcha**. Un atacante con muchas IPs puede saltarse el throttle.
- **Sin MFA/2FA**.
- **Sin lockout** definitivo tras N intentos por cuenta — sólo throttle de 60s.
- **Sin notificación al user** ante login desde IP nueva.

**Acción**:
- [ ] Considerar hCaptcha tras 3 intentos fallidos.
- [ ] Implementar TOTP 2FA para owner+super_admin (opcional, opt-in).
- [ ] Email al user en login desde IP nueva (cuando MAIL_* esté configurado).

### 4. Token theft

**Severidad**: 🔴 Crítica.

**Vector**:
- XSS que extrae el token de `localStorage`.
- Acceso físico al device del owner con localStorage no encriptado.
- Logging accidental del token en algún output.

**Controles activos**:
- Tokens hash en BD (no plaintext) → un dump de BD no expone los tokens.
- Sanctum permite revocar tokens individualmente (`tokens()->delete()`).
- Headers de seguridad en nginx (`X-Frame-Options`, `X-Content-Type-Options`).
- React escapa por default → XSS difícil salvo `dangerouslySetInnerHTML`.

**Gaps**:
- `localStorage` accesible desde JS → cualquier XSS o extensión maliciosa lo lee.
- **Sin expiración** (`expires_at` queda NULL → tokens viven indefinidamente).
- **Sin CSP** en nginx (permite cargar scripts de cualquier origin).

**Acción**:
- [ ] **Migrar token a cookie HttpOnly** emitida por `POST /auth/login` (manteniendo bearer para mobile / integraciones).
- [ ] Setear `expires_at` con TTL razonable (30 días con refresh sliding).
- [ ] Definir CSP (`script-src 'self'; style-src 'self' fonts.googleapis.com; ...`).
- [ ] Auditar logs para que nunca incluyan `Authorization` header.

### 5. XSS

**Severidad**: 🟠 Alta.

**Vector**: input del owner (nombre del local, descripción del producto, mensaje en notificación) se renderea en la landing pública o panel admin sin escape.

**Controles activos**:
- React escapa por default.
- `dangerouslySetInnerHTML` no se usa en el código actual (validado por grep).
- Inputs validados por `FormRequest` (límite de tamaño, tipos).

**Gaps**:
- **Sin CSP** (mitigaría drásticamente impacto).
- Si en algún momento se introduce markdown rendering en descripciones, hay que sanitizar.

**Acción**:
- [ ] CSP en headers.
- [ ] Si se introduce markdown → usar DOMPurify y allowlist conservadora.

### 6. SQL Injection

**Severidad**: 🔴 Crítica.

**Vector**: parámetros del cliente concatenados a queries raw.

**Controles activos**:
- **Todas las queries** usan Eloquent o Query Builder → parametrized statements automáticamente.
- `DB::raw()` se usa sólo en `MetricasService` con expresiones constantes (no input del user).
- Inputs validados por `FormRequest`.

**Gaps**:
- Bajo riesgo actual. Vigilar PRs que introduzcan `DB::statement(...)` con interpolación.

**Acción**:
- [ ] Regla de revisión: cualquier uso de `DB::raw` o `whereRaw` con interpolación de input requiere justificación + test.

### 7. File upload abuse

**Severidad**: 🟠 Alta.

**Vector**: subir `.php` u otro archivo ejecutable disfrazado como imagen, lograr ejecutarlo desde el `/storage/...`.

**Controles activos**:
- `StoreImageRequest` valida mimetype real (`mimetypes:image/jpeg,...`) y tamaño max 5 MB.
- Extension regenerada server-side desde el original.
- Nombre del archivo random (`Str::random(8)`) — evita override de archivos del sistema.
- nginx no ejecuta PHP fuera del `public/` (configuración por defecto + `location ~ \.php$` solo en root).

**Gaps**:
- **Sin antivirus / scan** del contenido.
- **Sin verificación de "es realmente imagen"** beyond mimetype y getimagesize (un atacante puede embedir PHP dentro de una imagen válida — "polyglot file").
- Si nginx alguna vez sirve `/storage/...` con `location ~ \.php$` (mal config), el polyglot ejecuta.

**Acción**:
- [ ] Cuando se migre a S3/Cloudinary, el problema desaparece (S3 no ejecuta PHP).
- [ ] Mientras tanto: validar nginx `default.conf` no permite ejecución en `/storage/`. (Hoy no se ejecuta porque `root` es `/var/www/html/public` y `storage/app/public` está bajo `public/storage` symlink — pero un misconfig podría romperlo.)
- [ ] Considerar ClamAV scan asíncrono via Job (Fase 6+).

### 8. Tampering del payload del pedido público

**Severidad**: 🟠 Alta. Atacante intenta crear pedido con producto inexistente o precio adulterado.

**Vector**: `POST /public/pedidos/{slug}` con `producto_id` de otro local, o con `extras` falsos.

**Controles activos**:
- `OrderService::crear` carga productos `where('local_id', $local->id)` → producto de otro local no se encuentra → error.
- Precio **snapshotteado del backend** — el cliente puede mandar lo que quiera en el body, se ignora.
- Extras: el `price` viene del cliente pero **se almacena tal cual** en `extras_seleccionados` (sólo se usa para el cálculo del subtotal de la línea).

**Gaps**:
- ⚠️ **Precio de extras NO se valida contra el catálogo del producto**. Un atacante manda `extras: [{group:"X", item:"Y", price: -100}]` y el subtotal baja.

**Acción**:
- [ ] **CRÍTICO**: en `OrderService::crear` validar que cada extra del payload coincide con uno definido en `$producto->extras` (mismo `group` + `item` + `price`). Si no coincide → rechazar.
- [ ] Test que cubra el ataque (extra con precio negativo / item inexistente).

### 9. DoS — saturar la API

**Severidad**: 🟠 Alta.

**Vector**: spam de `POST /public/pedidos/{slug}` o `POST /uploads/image`.

**Controles activos**:
- Throttle global 60 req/min.
- `POST /public/pedidos/{slug}` con throttle adicional 20/min.
- `POST /uploads/image` con throttle 30/min.
- Throttle por user_id si autenticado, IP si no.

**Gaps**:
- Throttle por IP es fácil de evadir con muchas IPs.
- No hay **rate limit por tenant** — un local puede ser saturado individualmente.
- Sin **WAF** (Cloudflare en frente lo mitiga si está activo).

**Acción**:
- [ ] Rate limit por tenant (`local:<id>:public-orders`) — pendiente en Fase 7.
- [ ] Confirmar si Cloudflare está en frente y habilitarlo si no.

### 10. Exposición de stacktrace / debug info

**Severidad**: 🟡 Media.

**Vector**: `APP_DEBUG=true` accidental en prod expone Ignition con código fuente, valores de env, etc.

**Controles activos**:
- `apps/api/.env.example` tiene `APP_DEBUG=true` (es para dev).
- Producción debe poner `APP_DEBUG=false` explícitamente.

**Gaps**:
- **Sin validación automática**. Sólo disciplina.

**Acción**:
- [ ] Health check en CI que pegue a `https://clicktoeat-api.lumiaaisolutions.com/_ignition` y falle el deploy si responde 200.
- [ ] Pre-commit hook que advierta si `.env.production` o `.env` (no `.example`) tiene `APP_DEBUG=true`.

### 11. Filtración de credenciales en git

**Severidad**: 🔴 Crítica.

**Vector**: alguien commitea `apps/api/.env` con APP_KEY/DB_PASSWORD reales.

**Controles activos**:
- `.gitignore` excluye `.env` y `.env.local`.

**Gaps**:
- Una `git add -A` accidental podría incluir el `.env` si alguien lo renombró antes.
- **Sin git hooks** que escaneen secretos antes de push.

**Acción**:
- [ ] Pre-commit hook con `gitleaks` o `trufflehog`.
- [ ] Verificar trimestralmente que `git ls-files | grep -E "^\.env"` está vacío.

### 12. Suplantación del WhatsApp del local

**Severidad**: 🟡 Media (es problema más del negocio que técnico).

**Vector**: alguien manipula la URL `wa.me/<num>?text=...` cambiando el número antes de enviarla al cliente.

**Controles activos**:
- Backend construye la URL del lado servidor; el cliente sólo abre `whatsapp_url` recibida.
- HTTPS protege en tránsito.

**Gaps**:
- Si la conexión es interceptada (MITM con cert spoofing), el atacante puede reescribir. HTTPS bien implementado lo evita.

**Acción**:
- [ ] HSTS en headers (cuando se documente).

### 13. Phishing al owner

**Severidad**: 🟠 Alta. Compromiso de cuenta.

**Vector**: email/SMS al owner pidiendo "verifica tu cuenta" linkeando a un dominio similar.

**Controles activos**:
- No hay (es fuera del control técnico del sistema).

**Acción**:
- [ ] Educación: nunca pediremos password por email. Documentar en user-guides.
- [ ] DKIM/SPF/DMARC del dominio (cuando se introduzca email — Fase 7).

### 14. Borrado masivo accidental por owner

**Severidad**: 🟡 Media (es UX más que security).

**Vector**: owner hace click en "Eliminar" sin entender que borra todo.

**Controles activos**:
- Soft delete en `productos`, `pedidos`, `locales`, `users`, `compras`.
- 409 con mensaje si categoría tiene productos / ingrediente tiene recetas.

**Gaps**:
- **Sin confirmación obligatoria** del frontend para borrados destructivos.
- **Sin endpoint de restore** desde soft-delete (pendiente Fase 7).

**Acción**:
- [ ] Modal de confirmación con tipo-a-confirmar para borrados >5 elementos.
- [ ] Implementar `POST /productos/{id}/restore` etc.

### 15. Logs con PII

**Severidad**: 🟡 Media. Si los logs se filtran, se filtra PII.

**Vector**: `Log::info("Pedido $pedido->cliente_telefono")` accidental.

**Controles activos**:
- Disciplina del equipo. No hay validación automática.

**Gaps**:
- No hay log scrubbing.

**Acción**:
- [ ] Setear redactor en `LogContext` que reemplace `cliente_telefono`, `cliente_direccion`, `email`, `password` en cualquier serialization.

---

## Resumen — top 5 acciones críticas

1. **Validar precio de extras en `OrderService::crear`** (vector #8) — fácil + alto impacto.
2. **Setear `expires_at` en tokens Sanctum** + considerar HttpOnly cookie (vector #4).
3. **CSP estricta en nginx** (vector #4 + #5).
4. **Rate limit por tenant** (vector #9).
5. **Pre-commit hook anti-leak de secretos** (vector #11).

## Matriz de severidad

```
                 │ Impacto bajo │ Impacto medio │ Impacto alto │ Impacto crítico
─────────────────┼──────────────┼───────────────┼──────────────┼─────────────────
Likelihood alta  │              │      #14      │      #3 #7   │       #11
Likelihood media │              │      #10 #15  │      #9 #13  │       #1 #4 #8
Likelihood baja  │              │      #12      │      #5      │       #2 #6
```

(#1 = tenant leakage, #2 = IDOR, etc.)

## Revisión

- Revisar este documento **cada release menor** o tras cualquier incidente.
- Actualizar tras nuevas features (especialmente auth, uploads, payments, integraciones externas).
- Documentar nueva amenaza descubierta en runtime con un postmortem + actualización aquí.
