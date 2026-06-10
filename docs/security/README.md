# Security

Documentación de seguridad de ClickToEat. **Living document** — actualizar cuando cambien controles o se detecten gaps nuevos.

## Audiencia

- Devs que van a tocar auth, multi-tenancy, validación de input, manejo de archivos o secretos.
- On-call que necesita responder a un incidente.
- Auditores externos (cuando exista una auditoría formal).
- Quien quiera entender qué datos personales se manejan y cómo se protegen.

## Documentos

- [Threat model](threat-model.md) — vectores de ataque, controles activos, gaps conocidos.
- [Inventario de datos](data-inventory.md) — qué PII se guarda, dónde, por cuánto tiempo.
- [Incident response](incident-response.md) — protocolo ante incidente de seguridad.
- [Checklist de seguridad pre-deploy](security-checklist.md) — qué validar antes de empujar a prod.

## Principios

1. **Defensa en profundidad**: ningún control es la única línea — el TenantScope + las Policies + los FormRequests trabajan juntos.
2. **Fail closed**: si la autorización falla por un bug, el comportamiento default es bloquear, no permitir.
3. **Datos mínimos**: capturamos sólo lo necesario para entregar el pedido (nombre + WhatsApp; dirección sólo si es delivery; lat/lng opcionales).
4. **No confiar en el cliente**: toda validación se reaplica en el backend, sin importar si el frontend ya validó.
5. **Trazabilidad**: cambios sensibles (cambio de password, ajuste manual de stock, cancelación de pedido con reintegro) quedan registrados en `movimientos_inventario` o auditables por timestamps.
6. **Blameless culture**: si algo falla por configuración, el sistema lo permitió. Arreglar el sistema, no al humano.

## Cómo reportar una vulnerabilidad

Si encontraste una vulnerabilidad y eres externo al equipo: **no abras un issue público**. Envía un email a `security@lumiaaisolutions.com` (o el contacto que defina el equipo) con:

- Descripción del problema.
- Pasos de reproducción.
- Impacto estimado.
- Tu nombre / handle para crédito (opcional).

Responderemos en ≤ 5 días hábiles y trabajaremos contigo bajo política de disclosure responsable.

## Marco legal y compliance

- **PFPDPPP México** (Ley Federal de Protección de Datos Personales en Posesión de los Particulares) — aplica porque manejamos datos de personas físicas (clientes del local).
- **GDPR** — aplica si llegamos a tener locales que sirven a residentes de la UE.
- **PCI DSS** — **no aplica hoy** porque no procesamos pagos online. Si en el futuro se integra Stripe/MercadoPago, evaluar PCI SAQ-A (delegación al provider).

Ver [`data-inventory.md`](data-inventory.md) → sección "Marco legal".

## Glosario rápido

- **PII** — Personally Identifiable Information (info que identifica a una persona).
- **IDOR** — Insecure Direct Object Reference (acceder a recurso de otro usuario cambiando el ID en URL).
- **Tenant leakage** — un local ve datos de otro local. Específico de SaaS multi-tenant.
- **Blast radius** — alcance del daño potencial de un compromiso.
- **MTTR** — Mean Time To Recovery.
