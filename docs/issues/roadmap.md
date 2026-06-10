# Roadmap actualizado

> Sustituye la tabla "Roadmap" del README, que está desactualizada al 2026-06-10.

## Estado real

| Fase | Módulo                                                                                  | Estado actual         |
|------|-----------------------------------------------------------------------------------------|-----------------------|
| 1    | Monorepo + Docker + auth Sanctum + multi-tenant + endpoint público                       | ✅ hecho               |
| 2    | CRUD productos + categorías + branding + uploads + admin shell                            | ✅ hecho (uploads local — pendiente Cloudinary o S3) |
| 3    | Pedidos persistentes + ingredientes + recetas + descuento automático de inventario        | ✅ hecho               |
| 4    | Panel super_admin: alta/suspensión de locales + reset password owner                       | ✅ hecho (faltan métricas globales + transferencia de owner) |
| 5    | PWA + QR del menú + dark mode + SEO avanzado                                              | 🟡 parcial — QR ✅, PWA ❌, dark mode parcial, SEO mínimo |
| 6    | WebSockets (tiempo real) + cupones + programa de lealtad                                   | ❌ pendiente            |

## Próximas prioridades sugeridas

### Estabilización (4-6 semanas)
1. **Limpieza de discrepancias README ↔ código** (ver [`discrepancias-readme.md`](discrepancias-readme.md)).
2. **CI/CD básico**: phpunit + pint + tsc + eslint en cada push.
3. **Dockerfile productivo del frontend** + **multi-stage del backend**.
4. **Storage de uploads**: decidir Cloudinary o S3 y migrar.
5. **Rotación de `APP_KEY`** + sacarla del repo.
6. **Healthchecks** en api / nginx / web.
7. **Backup automatizado** de MySQL.
8. **Sentry o equivalente** para error reporting.

### Capacidad operativa (6-10 semanas)
1. **Reset de contraseña por email** + verificación.
2. **CRUD de staff** desde el panel del owner.
3. **Idempotencia** en `POST /public/pedidos/{slug}`.
4. **WebSockets / SSE** para notificaciones en tiempo real.
5. **Factories** + extender suite de tests a auth, uploads, categorías, productos.
6. **Audit log**.

### Crecimiento (10-16 semanas)
1. **Pagos online** (Stripe / Conekta / MercadoPago).
2. **Cupones y descuentos**.
3. **Programa de lealtad** (cliente identificado).
4. **PWA + push notifications**.
5. **SEO**: metadata por landing, sitemap, OG dinámico, JSON-LD.
6. **Métricas globales** para super_admin.

### Largo plazo
1. **Multi-sucursal** (un owner con varios locales).
2. **WhatsApp Business API** real.
3. **Webhooks salientes** (integraciones tipo Zapier).
4. **Lotes / caducidad** en inventario.
5. **Forecasting**.
6. **Internacionalización** (i18n del frontend, multi-currency).
