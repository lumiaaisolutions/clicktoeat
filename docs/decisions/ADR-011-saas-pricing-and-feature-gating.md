# ADR-011 — SaaS con 3 planes pagados y feature gating por suscripción

> **Estado**: Aprobado, pendiente implementación.
> **Fecha**: 2026-06-12.
> **Decisor**: Owner del proyecto.
> **Implementación estimada**: ~13 días dev — ver [`features/saas-billing.md`](../features/saas-billing.md).

## Contexto

ClickToEat empezó como sistema multi-tenant donde cada local tenía acceso completo a todos los módulos. Tras validar el producto con dos locales activos (`tacos-el-gordo`, `pizza-bambino`), se decide monetizar como SaaS B2B con tres planes diferenciados por features y límites cuantitativos.

El objetivo es:

1. **Generar ingresos recurrentes** desde el primer cliente.
2. **Segmentar el mercado** — locales pequeños no quieren pagar por POS o inventario; cadenas necesitan métricas y audit log.
3. **Crear un funnel de upgrade** que crezca con el negocio del cliente.

## Decisión

### Tres planes con incrementos 3× y 5×

| Plan | Precio | Posicionamiento |
|------|--------|-----------------|
| Esencial | $99 MXN/mes | "Ya estoy vendiendo por WhatsApp" — catálogo básico + landing |
| Profesional | $299 MXN/mes | "Opero mi local" — inventario, recetas, métricas, staff |
| Premium | $499 MXN/mes | "Escalo mi negocio" — POS, audit log, métricas avanzadas |

Distribución de features completa: ver [`features/saas-billing.md#planes`](../features/saas-billing.md#planes).

### Trial de 14 días sin tarjeta

Stripe Checkout en modo `subscription` con `trial_period_days: 14` y `payment_method_collection: 'if_required'`. El usuario crea cuenta y empieza a operar sin dar tarjeta. Al día 14, Stripe le pide tarjeta para continuar.

**Por qué sin tarjeta**: conversión 30-50% mayor vs trial con tarjeta. La fricción de meter tarjeta filtra demasiado prospects válidos en B2B SMB mexicano.

**Trade-off**: churn al día 14 será alto (50-60%). Compensado por volumen.

### Stripe Checkout vs Stripe Elements

Elegido **Stripe Checkout** (página alojada por Stripe).

| | Checkout | Elements |
|--|----------|----------|
| Setup tiempo | 1 día | 3-4 días |
| PCI compliance | Stripe maneja | Tú manejas (SAQ A-EP) |
| UI personalizada | Limitada (logo + colores) | Total |
| Mobile-friendly | Built-in | Tú implementas |
| 3D Secure | Auto | Manual |
| Apple Pay / Google Pay | Auto | Configurar |

Para un SaaS en arranque la UI personalizada del checkout no es diferencial. Empezamos con Checkout y migramos a Elements solo si validamos que la fricción afecta conversión.

### Slug bajo dominio principal

URLs públicas se mantienen como `clicktoeat.lumiaaisolutions.com/{slug}` para todos los planes. No hay subdominios ni dominio personalizado en esta fase.

**Por qué**: simplicidad operativa. Wildcard SSL en Hostinger Business Shared no está validado y agregar CNAMEs por cliente complica el deploy. Si en el futuro queremos un plan Enterprise con dominio propio, lo agregamos como add-on aparte.

### Gating por feature flag, no por endpoint

El sistema de feature gating se implementa con:

1. Una clase `App\Support\Features` con constantes string.
2. Tabla `plans` con columna `features` (JSON array).
3. Middleware `RequiresFeature` que devuelve `402 Payment Required` si falta.
4. Frontend store `usePlan` con `has(feature)`.
5. Componente `<LockedFeature>` que muestra overlay bloqueado en vez de ocultar.

Detalles en [`features/feature-gating.md`](../features/feature-gating.md).

### Mostrar módulos bloqueados (no ocultarlos)

El sidebar admin muestra TODOS los módulos. Los que no están en el plan tienen ícono 🔒 y al entrar muestran un overlay con CTA "Subir a Profesional". Esto crea **deseo de upgrade** vs un sistema donde no sabes qué te falta.

## Alternativas consideradas

### Cobro vía transferencia + factura manual

**Rechazado**: en SMB mexicano la conversión cae 70% si no aceptas tarjeta. Además genera trabajo operativo del owner cada mes (verificar pagos, mandar facturas).

### Plan único $199 MXN con todo

**Rechazado**: deja dinero en la mesa de los locales grandes y aleja a los pequeños que solo quieren empezar. Tres planes capturan más segmento.

### Cobro por uso (pay-per-pedido)

**Rechazado**: requiere instrumentación de billing en cada pedido + facturación variable mensual. Demasiado overhead. Suscripción mensual es predecible para ambos lados.

### Lemon Squeezy / Paddle como Merchant of Record

**Rechazado por ahora**: paga 5% extra para que ellos manejen impuestos globales. Para cliente mexicano con Stripe MX es innecesario. Reconsiderar si expandimos a Argentina/Colombia.

## Consecuencias

### Positivas

- **MRR predecible** desde el primer cliente.
- **Path de upgrade claro** — los locales que crezcan migran solos.
- **Stripe maneja** retry de pago fallido, retención del periodo de gracia, facturación, IVA, recibos.
- **Trial sin tarjeta** baja la barrera de entrada — la métrica clave a optimizar es Trial → Paid.
- **Gating visible** (módulos con candado) educa al cliente sobre lo que existe.

### Negativas

- **Churn al día 14** será alto (~50%). Compensable con onboarding asistido en Profesional/Premium.
- **Complejidad operativa nueva**: manejar webhooks, eventos de subscripción, gracia por pago fallido, prorrateo de cambios de plan.
- **Soporte aumenta**: cada cambio de plan genera dudas. Hay que documentar bien la UX de billing.
- **Plan freemium queda fuera por ahora** — perdemos volumen de prospects. Reconsiderar en 90 días.
- **Lock-in técnico con Stripe** — migrar a otro PSP requeriría reimplementar el módulo.

### Pendientes operativos derivados

Documentados en [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md):

1. Crear 3 productos en Stripe Dashboard + 3 precios recurring mensuales.
2. Obtener `pk_live_…`, `sk_live_…`, `whsec_…`.
3. Configurar Webhook endpoint apuntando a la API.
4. Habilitar Customer Portal con cancelación + cambio de plan + facturas.
5. Configurar Tax / IVA con RFC.
6. **Términos de servicio + política de privacidad** legales (LFPDPPP + Ley de Protección al Consumidor). No bloqueante para MVP pero crítico antes de cobrar a 50+ clientes.
7. **Refund policy** clara en página de pricing.

## Referencias

- [Stripe Checkout docs](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [`features/saas-billing.md`](../features/saas-billing.md) — arquitectura del módulo
- [`features/feature-gating.md`](../features/feature-gating.md) — implementación del gating
- [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md) — setup Stripe paso a paso
- [`runbook/cambiar-precio-plan.md`](../runbook/cambiar-precio-plan.md) — procedimiento ops
