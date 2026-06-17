# API pública para integradores · A/B testing de menú

## API pública

### ¿Qué es?

Exponer una versión LIMITADA de los endpoints del backend para que sistemas
de TERCEROS (no tu owner directo) puedan consumir/escribir datos. Por ej.:
- Un ERP que quiere sincronizar inventario
- Un panel de cocina externo (KDS de terceros)
- Una herramienta de analytics que el cliente contrata aparte
- Zapier / Make.com para automatizaciones del owner

### Para qué sirve

- Vendes ClickToEat **como plataforma**, no solo como SaaS cerrado.
- Owners avanzados pueden conectar herramientas que les caen mejor.
- Llave de oro para empresas grandes (cadenas) que ya tienen ERP.

### Qué necesitas implementar

1. **Personal Access Tokens** dedicados (separados del bearer del owner):
   - Owner crea tokens API en `/admin/integraciones`
   - Scopes: `read:pedidos`, `write:pedidos`, `read:productos`, etc.
2. **Rate limit por token** (no por IP) — más generoso (200/min) que el
   owner web.
3. **OpenAPI/Swagger público** — ya existe interno en
   `/api/documentation`, abrir al público con `auth=token`.
4. **Webhook outgoing**: el owner registra una URL → cuando crea pedido,
   POST a esa URL con HMAC-SHA256 firma. Ya existe parcialmente como
   feature Premium pero no documentado.
5. **Versionado**: `/api/v1/...` ya es la convención. Si rompemos, sale
   `/api/v2/...`.

### Status

📅 **Documentado, no implementado**. El backend ya soporta API tokens
de Sanctum y la mayoría de endpoints son REST. Falta:
- UI en `/admin/integraciones` para crear/revocar tokens
- Docs OpenAPI con ejemplos para terceros
- Webhook UI completo

### Plan de implementación (cuando se haga)

**Fase A** (2 días):
- UI en `/admin/integraciones` con CRUD de tokens
- Endpoint `POST /admin/api-tokens` con scopes

**Fase B** (1 día):
- Publicar `/api/v1/documentation` accesible públicamente con auth banner

**Fase C** (2 días):
- Webhook outgoing completo (existe el modelo, falta UI + delivery
  background con retry)

---

## A/B testing de menú

### ¿Qué es?

Probar 2 versiones del menú de un local y medir cuál vende más. Por ejemplo:

- **Versión A**: producto "Hamburguesa" $120 con foto profesional
- **Versión B**: producto "Hamburguesa" $115 con foto casera

El 50% de clientes que entran a la landing ven A, el otro 50% ven B.
Después de 1 semana, se analiza:
- Conversión a pedido (cuántos pidieron)
- Ticket promedio
- Velocidad de checkout

Ganador se promueve a "vivo" para 100%.

### Por qué tarda en ser útil

- Necesitas **mucho tráfico**. Para detectar una diferencia significativa
  necesitas > 1000 sesiones por variante. Un local con 5 pedidos al día
  no tiene tráfico suficiente.
- Por eso solo aplica con **> 50 pedidos/día por local**.

### Qué necesitas implementar

1. **Tabla `ab_experiments`**: variante, métrica, umbral, fecha inicio/fin.
2. **Cookie persistente** del cliente para asignar variante (mismo
   cliente siempre ve la misma para evitar sesgo).
3. **Tracking de eventos**: cada vista de producto, cada add-to-cart,
   cada checkout completado se atribuye a la variante.
4. **Dashboard** que muestra conversión por variante con
   significancia estadística (chi-square o similar).

### Status

📅 **No prioritario para v1.0**. Implementar cuando:
- Tengas >= 5 locales con > 50 pedidos/día
- Los owners pidan "no sé qué precio poner"

### Plan de implementación (cuando se haga)

Estimado: 1 semana dev backend + 3 días dashboard frontend.

Considerar usar una librería existente como **GrowthBook** o **Flagsmith**
en vez de implementar from-scratch — feature flags + A/B testing solucionados.
