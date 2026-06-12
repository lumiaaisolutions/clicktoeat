# ADR-009: Audit log con Observers (no event sourcing)

> **Status:** aceptada
> **Fecha:** 2026-06-10
> **Decisores:** equipo + senior dev review

## Contexto

Operacionalmente necesitamos saber:

- ¿Quién bajó el precio del taco al pastor el martes?
- ¿Quién canceló el pedido CE-AB12CD?
- ¿Quién creó al staff "Juan" que está abusando del sistema?
- (Compliance LFPDPPP / GDPR cuando aplique:) ¿Qué cambios tocaron PII de María?

Sin trazabilidad, es imposible debuggear incidentes y cubrir disputas con owners ("yo no toqué el precio").

## Decisión

**Audit log via Eloquent Observers**, sin event sourcing.

- Tabla `audit_logs` append-only: `local_id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `changes` (JSON con diff), `ip`, `user_agent`.
- `AuditObserver` reutilizable conectado a Local / User / Categoria / Producto / Ingrediente / Pedido / Compra desde `AppServiceProvider::registerAuditObservers`.
- Captura: `created`, `updated` (con diff), `deleted`, `restored`.
- `password` y demás campos del `ignoredFields` se filtran automáticamente.
- Retención: 90 días (cron en `bootstrap/app.php → withSchedule`).

Endpoint `GET /audit-logs` con filtros (`resource_type`, `action`, `actor_user_id`, `desde`, `hasta`). Sólo accesible a owner del local + super_admin.

## Alternativas consideradas

- **Event sourcing completo** (cada cambio = event, modelos derivados) → descartada. Overhead masivo para una app CRUD-mostly. Pertinente cuando el negocio requiere reconstruir estado a cualquier punto temporal (banca, finance), no para ClickToEat.
- **Logs en archivo + grep** → descartada. No accesible al owner desde el panel, no estructurado para queries.
- **Tabla `audit_logs` con triggers SQL** → descartada. Lock-in al DBMS, difícil de testear, captura cambios SQL crudos (no eventos de dominio como "pedido_cancelado").
- **Servicio externo** (Datadog Audit Logs, AWS CloudTrail) → descartada. Costoso, vendor lock-in, latencia de query. La opción in-DB es ágil para el SLA de owner.
- **Sólo loggear acciones explícitas** (decorar handlers) → descartada. Fácil olvidar el log al agregar un endpoint nuevo. Observers cubren TODO automáticamente.

## Consecuencias

### Positivas

- **Trazabilidad inmediata** desde el panel del owner (cuando se implemente UI).
- **Cero código en controllers** — el observer captura solo.
- **Diff legible** del campo cambiado (`{ nombre: ['Viejo', 'Nuevo'] }`).
- **Cubre cambios futuros** automáticamente — agregar un modelo nuevo a la lista del provider, listo.
- **Filtra password** automáticamente.

### Negativas

- **Un INSERT por cada UPDATE** de modelos auditados — ~10-30% overhead de escritura. Aceptable para volúmenes actuales (<100 ops/h por local).
- **`getChanges()` no captura mutadores complejos** (ej. JSON casts internos cambiados). Si en el futuro hace falta diff fino de `extras`, agregar lógica custom.
- **No captura acciones non-Eloquent**: login, logout, generación de URL WhatsApp, requests fallidas. Para esto agregar `AuditLogger::log()` explícito desde el endpoint.
- **Crece sin control si no hay cron** — mitigado con el scheduler que borra > 90 días.

### Neutras

- **Storage**: ~200 bytes promedio por entry. Con 1000 ops/día = 73 MB/año. Trivial.
- **Sin retención eterna por compliance** — 90 días es el SLA. Si necesitamos más (auditoría legal), exportar mensualmente a archivo frío.

## Reglas críticas

1. **NUNCA loggear passwords/tokens** — `AuditObserver::$ignoredFields` lo enforza. Validado por test.
2. **`saveQuietly()` para evitar loops** cuando un Observer hace updates a otros modelos.
3. **`audit_logs` jamás se edita** desde código — sólo INSERT (observer) o DELETE (cron de retención).

## Cuándo reabrir

- Si compliance exige retención > 1 año → archivar a object storage (B2) en cold tier antes de purgar.
- Si necesitamos diff de campos JSON complejos (`extras`, `meta`) → mejorar `getChanges()` capture custom.
- Si el volumen llega a > 100k ops/día → considerar tabla particionada o exportar a Loki / OpenSearch para queries más rápidas.

Ver [`docs/features/`](../features/) — no hay doc específica de audit log aún; pendiente crear `docs/features/audit-log.md`.
