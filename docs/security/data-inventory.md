# Inventario de datos personales (PII)

> Qué datos personales manejamos, dónde viven, cuánto tiempo se conservan, y qué controles los protegen.

## Marco legal aplicable

- 🇲🇽 **LFPDPPP** (Ley Federal de Protección de Datos Personales en Posesión de los Particulares) — la dependencia es **directa** porque manejamos datos de personas físicas mexicanas.
- 🇪🇺 **GDPR** — aplicaría si llegamos a tener clientes en EU.
- **PCI DSS** — **NO aplica** hoy (no procesamos pagos online).

LFPDPPP exige (resumen ejecutivo):
- Aviso de privacidad accesible al cliente.
- Consentimiento explícito para tratamiento.
- Permitir ARCO (Acceso, Rectificación, Cancelación, Oposición).
- Avisar de incidentes que afecten datos.
- Designar a un encargado de tratamiento de datos.

## PII que manejamos

### En `pedidos`

| Campo                | Tipo de PII          | Recolectado por           | Cuándo                                |
|---------------------|----------------------|---------------------------|---------------------------------------|
| `cliente_nombre`     | Identificador directo | Cliente vía form público  | Al crear pedido                       |
| `cliente_telefono`   | Identificador directo | Cliente vía form público  | Obligatorio para WhatsApp              |
| `direccion`           | Identificador combinado | Cliente vía form público | Sólo si `metodo_entrega=delivery`     |
| `notas`               | Free text             | Cliente vía form público  | Puede contener cualquier cosa         |

**Sensibilidad**: media. Permite identificar, contactar y posiblemente localizar al cliente.

**Justificación de retención**: el pedido es la unidad de venta del local — el owner necesita histórico para servicio postventa, contabilidad, reclamos. Soft delete está disponible para "borrar" desde el panel.

**Retención recomendada**: indefinida con soft-delete cuando el cliente pide. Hard-delete obligatorio si el cliente ejerce ARCO (cancelación).

### En `detalle_pedidos`

Sólo datos del pedido (no del cliente directamente). Si el `pedido` se borra (soft), los detalles se ven a través del padre.

### En `personal_access_tokens`

| Campo       | Tipo                                  |
|------------|---------------------------------------|
| `token`     | Hash SHA-256 del token plaintext (no extraíble) |
| `name`      | Nombre del dispositivo (ej. "web")     |
| `last_used_at` | Marca temporal del último uso       |
| `expires_at` | Hoy queda NULL (vulnerable — ver threat-model #4) |

**Sensibilidad**: alta. Aunque el token está hasheado, el `tokenable_id` revela qué user lo usa.

### En `users`

| Campo                | Sensibilidad |
|---------------------|--------------|
| `email`              | Identificador directo. |
| `password`           | Bcrypt hash. No plaintext.|
| `remember_token`     | Hash. |
| `nombre`             | Identificador directo. |

Sólo para owner / staff / super_admin — no para clientes finales.

### En `notificaciones`

`data` (JSON) puede tener `ingrediente_id`, `stock`, etc. — no es PII pero es info de negocio.

### En `sessions` / `cache`

- `sessions`: contiene `ip_address` y `user_agent` del owner/staff que usa el panel.
- `cache`: hoy no se cachea PII de clientes.

### Logs

- `storage/logs/laravel.log` — puede contener stacktraces con datos del request si hay un error. Hoy **no se redacta**.
- `storage/logs/php.log` — errores PHP. Generalmente sin PII.
- Logs nginx (depende de configuración Hostinger).

## Coordenadas geográficas

Los pedidos pueden incluir `lat`/`lng` del cliente:

- **Opt-in implícito** del cliente (debe permitir geolocalización en su navegador).
- Sólo se guarda si la forma de pedido del frontend lo captura y lo envía.
- Hoy se usa sólo para validar **radio de entrega** server-side; **no se persiste** en `pedidos` (se descarta tras la validación).
- En `locales`, las coordenadas son del establecimiento (no del cliente) — no es PII de persona física.

## IP del cliente

- `POST /public/pedidos/{slug}` recibe la IP via `$request->ip()`.
- Hoy **no se persiste**.
- Sólo se usa para rate-limit (en memoria de RateLimiter).

⚠️ **Cuando se introduzca audit log** (Fase 7), valorar si se loggea IP — si sí, declararlo aquí.

## Retention policy (propuesta — no implementada)

| Dato                            | Retención propuesta                       |
|--------------------------------|-------------------------------------------|
| Pedidos (con PII de cliente)    | Indefinida con soft-delete al request del cliente |
| Logs (laravel.log)              | 30 días con rotación diaria, comprimido    |
| Sessions                         | 30 días (TTL implícito por `last_activity`) |
| Tokens Sanctum                   | 30 días desde `last_used_at` (cuando se implemente expiración) |
| Failed jobs                      | 90 días                                    |
| Notificaciones leídas            | 90 días                                    |
| Backups (BD completa)            | 7 diarios + 4 semanales + 12 mensuales      |

**Hoy no hay cron de purga**. Pendiente implementar (`app/Console/Kernel.php::schedule`):

```php
$schedule->call(function () {
    \DB::table('sessions')->where('last_activity', '<', now()->subDays(30)->timestamp)->delete();
    \DB::table('failed_jobs')->where('failed_at', '<', now()->subDays(90))->delete();
})->daily();

$schedule->command('sanctum:prune-expired --hours=720')->weekly();
```

## Controles activos sobre PII

| Control                          | Aplica a                                 |
|---------------------------------|------------------------------------------|
| HTTPS (TLS) en tránsito          | Toda la comunicación cliente ↔ servidor.   |
| Multi-tenant scope                | PII de pedidos sólo visible al local dueño + super_admin. |
| Soft delete                       | Pedidos / locales / users / productos.    |
| Auth requerida para `GET /pedidos/*` | Sólo owner/staff del local.            |
| Bcrypt hash                       | Passwords (no se almacena plaintext).      |
| Hash de tokens                    | Sanctum no almacena tokens plaintext.      |
| Validación de input               | FormRequests limitan longitudes, tipos, etc. |
| CORS estricto                     | Frontend allowlistado.                    |

## Acceso a la información

| Quién                | Puede ver qué                                              |
|---------------------|------------------------------------------------------------|
| Cliente              | Su propio pedido (no hay UI — sólo vía URL `wa.me` enviada). |
| Owner / staff del local | Todos los pedidos del local.                             |
| Super admin           | Todo (por su rol).                                         |
| Devs con SSH          | Todo lo de la BD productiva.                                |
| Backups               | Quien tenga acceso al bucket B2.                            |

**Recomendación**: aplicar least-privilege en acceso SSH al servidor productivo, y en credenciales de B2 (key con permisos sólo de `writeFiles` para el servidor; key separada con permisos completos para restore).

## Procedimiento de ARCO (Access, Rectification, Cancellation, Opposition)

Si un cliente solicita ejercer derechos ARCO sobre sus datos:

1. **Identificar** al solicitante (verificar que es realmente esa persona).
2. **Acceso** — exportar todos los pedidos asociados a ese `cliente_telefono`:
   ```sql
   SELECT p.*, dp.* FROM pedidos p
   LEFT JOIN detalle_pedidos dp ON dp.pedido_id = p.id
   WHERE p.cliente_telefono = '<numero>';
   ```
3. **Rectificación** — actualizar datos (nombre mal escrito, etc.).
4. **Cancelación** — **hard delete** de los pedidos asociados (no soft):
   ```sql
   DELETE FROM pedidos WHERE cliente_telefono = '<numero>';
   ```
   ⚠️ El owner pierde el histórico de esa persona. Aceptable bajo ley.
5. **Oposición** — no aplicable hoy (no hacemos marketing automatizado al cliente).
6. **Documentar** la solicitud y la acción en un registro auditable (`docs/runbook/arco-requests/`).

**Hoy no hay UI ni endpoint para automatizar esto**. Es manual del super_admin via Tinker o SQL. Pendiente: `DELETE /admin/pii?phone=<num>` con confirmación.

## Aviso de privacidad

Cada local debe publicar su propio aviso de privacidad (responsable: el local, no ClickToEat — somos el encargado del tratamiento).

ClickToEat como encargado debe firmar contrato de tratamiento con cada local que lo solicite formalmente.

**Pendiente**: template de aviso de privacidad que el local pueda usar, accesible desde la landing.

## Pendientes prioritarios

- [ ] Implementar cron de purga de datos viejos (sessions, failed_jobs, notificaciones leídas > 90d).
- [ ] Implementar `expires_at` en tokens Sanctum.
- [ ] Endpoint ARCO administrativo (super_admin only).
- [ ] Log scrubbing — redactor que reemplace `cliente_telefono`, `cliente_direccion`, `email`, `password` en cualquier output.
- [ ] Template de aviso de privacidad para landing pública.
- [ ] Documentar designación del encargado de tratamiento (LFPDPPP requirement).
- [ ] Decidir si IP del cliente se loggea en `audit_logs` (cuando se implemente).
