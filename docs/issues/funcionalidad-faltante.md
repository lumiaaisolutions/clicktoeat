# Issues — Funcionalidad faltante

> Capabilities ausentes que el negocio/operación va a pedir tarde o temprano. Priorizado por impacto.

## ✅ Cerrado en Fase 7 (2026-06-10)

- ✅ **Idempotency-Key en POST /public/pedidos/{slug}** — middleware + tabla. Ver [`features/idempotency.md`](../features/idempotency.md).
- ✅ **Reset de contraseña por email** — endpoints `/auth/forgot-password` + `/auth/reset-password` con `Password` broker de Laravel. Mailer `log` por default; configurar `MAIL_*` para prod. Ver [`features/password-reset.md`](../features/password-reset.md).
- ✅ **CRUD de staff** — endpoints `/local/staff` (owner gestiona su equipo). UserPolicy registrada.
- ✅ **Audit log** — tabla `audit_logs` + `AuditObserver` conectado a Local/User/Categoria/Producto/Ingrediente/Pedido/Compra. Endpoint `GET /audit-logs` (sólo owner + super_admin).
- ✅ **Rate limit por tenant** — limiter `public-orders-by-tenant` (100/min por `local:{slug}` + 20/min por IP) aplicado a `POST /public/pedidos/{slug}`.
- ✅ **Restore desde soft-delete** — filtros `?trashed=only|with` + endpoints `POST /productos/{id}/restore`, `/pedidos/{id}/restore`, `/compras/{id}/restore`, `/admin/locales/{id}/restore`.

Pendiente operativo derivado:
- ✅ Cron de limpieza para `idempotency_keys` / `audit_logs` / `sessions` / `sanctum` / `failed_jobs` / `notificaciones` → **Laravel Scheduler implementado** en `bootstrap/app.php`. Sólo falta agregar `* * * * * php artisan schedule:run` al cron de hPanel. Ver [`runbook/setup-cron-scheduler.md`](../runbook/setup-cron-scheduler.md).
- ✅ Frontend `/forgot-password` + `/reset-password` con enlace desde `/login`.
- ✅ Frontend `/admin/staff` con CRUD completo.
- ✅ Frontend `/admin/audit-log` con tabla paginada + filtros + diff expandible.
- ✅ Frontend filtros `?trashed=` + botón restore en `/admin/productos` y `/admin/pedidos`.
- [ ] Configurar `MAIL_*` con provider real en prod ([`runbook/setup-mail-hostinger.md`](../runbook/setup-mail-hostinger.md)).

## ✅ Cerrado en Fase 9 (2026-06-10) — Frontend + Pre-implementación

- ✅ **UI completa** para las features de Fase 7 (reset password, staff, audit log, restore).
- ✅ **S3/B2 pre-implementado** (sin tocar nada hasta que se active): `filesystems.php` con disk `s3`, `ImageUploader` agnóstico al disk, comando `php artisan uploads:migrar-a-s3` con `--dry-run`. Activación: `composer require league/flysystem-aws-s3-v3` + `S3_*` en `.env`.
- ✅ **Broadcasting Pusher pre-implementado**: `PedidoCreado` event con `ShouldBroadcastAfterCommit`, channel auth, `lib/echo.ts` con fallback transparente, store de notificaciones detecta si realtime está activo y reduce polling a 5 min. Activación: `composer require pusher/pusher-php-server` + `npm install pusher-js laravel-echo` + `PUSHER_*` en `.env`.

## Crítico (afecta la operación real)

### Reset de contraseña por email
- Tabla `password_reset_tokens` existe pero no hay endpoints.
- Hoy: si un owner olvida su clave, depende del super_admin para resetearla (`PATCH /admin/locales/{id}/owner-password`).
- Necesario:
  - `POST /auth/forgot-password` → envía email con token.
  - `POST /auth/reset-password` → valida token y actualiza.
  - Configurar `MAIL_*` en `.env` + driver Mailgun/SES/Resend/etc.

### Verificación de email
- `email_verified_at` se llena al seedear pero nunca se valida.
- Riesgo bajo en MVP, alto cuando se permita signup público abierto.

### Idempotencia en `POST /public/pedidos/{slug}`
- Si el cliente reintenta por red lenta, crea pedidos duplicados.
- Implementar header `Idempotency-Key` → tabla `idempotency_keys` con cache de respuesta para reintentos.

### Tiempo real para owner
- Hoy: polling de `/notificaciones` cada 30s.
- Implementar Reverb / Pusher / SSE para que un pedido nuevo aparezca al instante en el panel.
- Bonus: notificación de browser cuando llega pedido.

## Importante (UX / gestión)

### CRUD de usuarios staff
- Owner no puede crear/dar de baja staff de su local desde el panel.
- Endpoints faltan: `GET|POST|DELETE /local/usuarios`.
- Hoy se hace manual con Tinker o seeders.

### Restore desde soft-delete
- Hay soft-delete en `users`, `locales`, `productos`, `pedidos`, `compras`.
- No hay endpoint para listar trashed ni restaurar.
- Implementar: `GET /productos?trashed=true`, `POST /productos/{id}/restore`.

### Cupones y descuentos
- Campo `descuento` en `pedidos` siempre 0.
- Pendiente: tabla `cupones` (`codigo`, `tipo` fijo/%, `valor`, `vigencia`, `usos`, `min_total`).
- Aplicar en checkout público y POS.

### Programa de lealtad
- Asociar pedidos por `cliente_telefono` (hoy es texto libre).
- Tabla `clientes` opcional (sólo cuando consienten — hoy son anónimos).

### Métricas globales para super_admin
- No hay endpoint que agregue datos multi-local para el super_admin.
- Hoy: cada local tiene `/metricas` propio.

### Cierre de caja / arqueo
- POS no tiene "cerrar día / cuadrar caja".

### Propinas, split payment, devoluciones parciales
- POS las omite hoy.

## Inventario avanzado

### Lotes / FIFO / caducidad
- Hoy: un solo stock por ingrediente, sin tracking de lote.
- No se puede priorizar consumo del lote más viejo, ni alertar caducidad.

### Conteos físicos programados
- "Esta noche hay conteo, congelar movimientos hasta confirmar" — no soportado.

### Mermas por producto vendido vs. ajustes
- Hoy todo se etiqueta como `salida`/`merma`/`ajuste`. Falta un tipo `consumo_no_venta` p.ej.

## Seguridad

### MFA / 2FA
- Sin TOTP, sin SMS code.

### Login social (OAuth)
- Sin Google / Facebook / Apple.

### Rate limit por tenant
- Hoy: throttle por IP o user_id. Un local con muchos clients en la misma IP (oficina, hotel) puede ahogar al resto.

### Audit log
- Sin tabla `audit_logs`. No se sabe quién cambió qué.

### Rotación / expiración de tokens
- `expires_at` queda NULL en `personal_access_tokens`. Los tokens viven para siempre.

## Pagos

### Pagos online
- Stripe / MercadoPago / Conekta / Clip no integrado.
- Hoy `metodo_pago` es sólo etiqueta para WhatsApp.

### Webhooks de pago
- No hay endpoint para recibir `payment.succeeded` desde un provider.

## PWA / mobile

### Service worker
- La landing no es instalable, no funciona offline.
- Fase 5 en roadmap.

### Push notifications nativas
- Para owner y staff (alerta de pedido nuevo en el celular).

## SEO

- `generateMetadata` por landing del local (hoy: title default).
- `sitemap.xml`, `robots.txt`.
- OG image dinámica.
- Schema.org JSON-LD (Restaurant, Menu, MenuItem).

## API pública

### WhatsApp Business API
- Hoy: deep-link `wa.me`.
- Negocio futuro: enviar confirmación del pedido al cliente automáticamente (requiere Meta + BSP).

### Webhooks salientes
- "Notifica a Zapier cuando llega un pedido" — no soportado.

### API keys con scopes
- Hoy las abilities están en el token Sanctum pero ningún endpoint las verifica.
- Útil para integraciones que sólo necesitan `pedidos:read`.

## Calidad de vida

### Soft delete UI
- Productos / locales / pedidos eliminados no se ven desde el admin.

### Búsquedas fuzzy
- `?q=` hace LIKE `%term%`. Sin tipo Postgres fuzzy / Algolia / Meilisearch.

### Exports
- CSV / PDF de pedidos, compras, métricas. Hoy: nada.

### Logo / favicon dinámico
- El favicon es default Next. Cada local puede tener el suyo.

### Multi-sucursal
- Un owner = un local (1:1). No hay "owner con 3 sucursales".
- Requiere refactor mayor: pivot `local_user` con rol por local.

## Métricas / dashboards

### Margen real (no aprox)
- Hoy: `ventas - compras_del_rango`. Mezcla compras no consumidas con ventas.
- Real: `SUM(detalle.subtotal) - SUM(producto.costo_calculado_via_receta)` en el periodo.

### Comparativa vs periodo anterior
- "Esta semana vs la pasada" no se calcula.

### Forecasting de inventario
- "Con el ritmo actual te quedas sin tortilla en 2 días" — opcional.
