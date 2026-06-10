# Incident Response — Protocolo de seguridad

> Procedimiento a seguir cuando hay (o se sospecha) un incidente de seguridad.

## Definición

Es un **incidente de seguridad** si **una** de estas es verdad:

- 🚨 Acceso no autorizado a datos de cualquier local.
- 🚨 Cuenta comprometida (super_admin o owner).
- 🚨 Filtración de credenciales (APP_KEY, DB credentials, B2 keys, etc.).
- 🚨 Filtración pública de datos (dump apareció en pastebin, telegram, etc.).
- 🚨 Vulnerabilidad explotable confirmada en producción.
- 🚨 Tenant leakage confirmado (un local vio datos de otro).
- 🚨 Modificación maliciosa de pedidos, productos o inventario por un tercero.

Si **no estás seguro** si es incidente → trátalo como incidente. Mejor falso positivo que ignorado.

**No** es incidente:
- Outage por sobrecarga sin atacante identificado → ver runbooks de operación.
- Bug funcional sin impacto en privacidad / disponibilidad / integridad → issue normal.

## Niveles de severidad

| Severidad | Definición                                                                  | Tiempo de respuesta inicial |
|----------|-----------------------------------------------------------------------------|-----------------------------|
| **SEC-1** | Filtración pública confirmada de PII / credenciales productivas en uso       | Inmediato (< 15 min)         |
| **SEC-2** | Acceso no autorizado confirmado pero contenido / sin filtración pública      | < 1 h                         |
| **SEC-3** | Vulnerabilidad explotable confirmada pero sin evidencia de explotación        | < 4 h                         |
| **SEC-4** | Sospecha sin confirmación / vulnerabilidad de bajo riesgo                    | < 24 h                        |

## Las 5 fases (orden importa)

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐
│  Detección  │ →  │ Contención  │ →  │ Erradicación │ →  │ Recuperación│ →  │ Postmortem │
└─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘    └────────────┘
```

### 1. Detección

- ¿Quién detectó y cómo? (alerta automática / reporte externo / vulnerability disclosure / accidental)
- Snapshot **inmediato**: capturar evidencia antes de que se altere:
  - Logs (`storage/logs/laravel.log`, nginx, MySQL slow log).
  - Estado de la BD relevante (snapshot del dump si es pertinente).
  - Headers / payloads sospechosos.
  - Screenshots de la cuenta comprometida, si aplica.
- Abrir canal dedicado (`#sec-incident-<fecha>`) en Slack/equivalente — toda la comunicación va ahí.
- Designar **incident commander** (una sola persona — no se decide por comité).

### 2. Contención

Detener el daño en curso **sin** destruir evidencia:

| Caso                              | Acción de contención                                          |
|----------------------------------|---------------------------------------------------------------|
| Cuenta comprometida              | `User->tokens()->delete()` + reset password forzado            |
| Credenciales filtradas (APP_KEY)  | Rotar — ver [`runbook/rotar-app-key.md`](../runbook/rotar-app-key.md) |
| Tenant leakage activo            | Si bug evidente: deploy fix; si necesario: `php artisan down`  |
| Endpoint vulnerable explotándose  | Bloquear ruta en nginx (`return 403;` temporal)                |
| Backup leak (B2 expuesto)        | Rotar B2 keys, hacer bucket privado, evaluar qué se descargó    |
| Dump público de la BD             | Notificar afectados (LFPDPPP); ver "Comunicación" abajo         |

**Decisión clave en contención**: ¿bajar el servicio entero (`artisan down`) o no?

- Si el atacante sigue activo y no hay forma rápida de bloquearlo selectivamente → bajar.
- Si es contenible (bloquear IP / rotar token / parche puntual) → mantener arriba.

### 3. Erradicación

- Eliminar la causa raíz: deploy del fix, revocar credenciales abusadas, bloquear IPs / cuentas.
- Verificar que el vector está cerrado (intentar reproducir, idealmente desde otro IP/user).
- Buscar **persistencia**: ¿el atacante creó backdoors? Casos a chequear:
  - Nuevos usuarios `super_admin` no autorizados.
  - Tokens Sanctum con nombre extraño en `personal_access_tokens`.
  - Modificaciones a `app/Console/Kernel.php`, ServiceProviders, o middleware (deploy malicioso).
  - Webshells subidos via `/uploads/image` con polyglot.
  - Cron entries añadidas al servidor.

### 4. Recuperación

- Restaurar el servicio si estaba bajado.
- Restaurar datos desde backup si hubo pérdida — ver [`runbook/restaurar-backup-mysql.md`](../runbook/restaurar-backup-mysql.md).
- Validación end-to-end: login + smoke tests + checks específicos del incidente.
- Monitoreo intensificado por 24-72h para detectar re-explotación.
- Comunicación al equipo del cierre temporal.

### 5. Postmortem

Dentro de los **5 días hábiles** del cierre del incidente. Ver [`runbook/postmortems/README.md`](../runbook/postmortems/README.md).

Punto crítico: el postmortem **no** está completo hasta que los action items críticos estén implementados.

## Comunicación

### Interna

- Canal `#sec-incident-<fecha>` desde minuto 1.
- Update cada 30 min mínimo durante incidente activo (aunque sea "sigo investigando, sin novedad").
- Resumen ejecutivo al cierre.

### Externa — owners afectados

Si el incidente afecta a algún local específicamente:

- Comunicación al owner del local dentro de las **24h** del cierre.
- Vía: WhatsApp del owner registrado + email si existe.
- Contenido (template):
  ```
  Hola [Nombre del owner],

  Te escribimos para informarte de un incidente de seguridad que pudo
  haber afectado los datos de tu local [slug] en ClickToEat.

  Qué pasó: <descripción breve y honesta>
  Qué hicimos: <acciones de contención y mitigación>
  Qué datos pudieron verse afectados: <específico>
  Qué tienes que hacer: <si aplica — cambiar password, revisar pedidos, etc.>

  Lamentamos el incidente y trabajamos para que no vuelva a pasar.
  Cualquier duda, responde a este mensaje.

  — Equipo ClickToEat
  ```

### Externa — usuarios finales (clientes de los locales)

Si el incidente afecta PII de clientes de los locales:

- **LFPDPPP exige notificar** "de forma inmediata" a los titulares de los datos cuando hay incidente que afecte derechos patrimoniales o morales.
- Responsabilidad **conjunta** entre ClickToEat (encargado) y el local (responsable).
- Coordinación: el local notifica a sus clientes; ClickToEat le da el contenido y soporte.

### Externa — autoridad

Para incidentes SEC-1 con PII filtrada:
- Notificar a INAI (Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales) según corresponda.
- Plazo no específico en LFPDPPP — pero "sin demora" es el estándar.

### Externa — público

Sólo SEC-1 con visibilidad pública. Statement al sitio:
- Confirmar/desmentir lo que se reportó.
- Acción inmediata tomada.
- Acción de seguimiento.
- Contacto para preguntas.

**No especular** sobre causa raíz antes de tenerla confirmada.

## Decisiones difíciles

### ¿Hard delete de datos comprometidos?

Si el atacante exfiltró datos: el daño ya está hecho. Borrar los datos en tu BD **no** los recupera.

Pero **sí** considera:
- Cancelar tokens / sesiones de las cuentas comprometidas.
- Forzar reset password de cuentas afectadas.
- Documentar qué datos se filtraron (para cumplir notificación legal).

### ¿Pagar al atacante?

Si recibes una extorsión:
- **No prometas nada en chat**.
- Escala a stakeholders (legal, dirección).
- Coordinación con autoridades.
- En general, **no se paga** — no garantiza nada y financia más ataques. Pero es decisión del negocio, no técnica.

### ¿Revelar la vulnerabilidad al reportante?

Si fue disclosure responsable de un white-hat:
- Confirmar que fue arreglada.
- Dar crédito en un hall of fame si lo aceptan.
- Considerar un programa de bug bounty formal (cuando crezca el sistema).

## Roles durante incidente

| Rol                  | Responsabilidad                                       |
|---------------------|-------------------------------------------------------|
| **Incident Commander** | Toma decisiones. Una sola persona. No hace trabajo técnico. |
| **Tech lead**         | Diagnostica + ejecuta fixes. Reporta al IC.            |
| **Comunicador**       | Comunicación interna + externa. Reporta al IC.          |
| **Scribe**            | Anota timeline en tiempo real (insumo del postmortem). |

En equipo pequeño una persona puede tener varios roles, pero **siempre identificar el IC**.

## Herramientas y artefactos

- **Canal Slack dedicado** por incidente.
- **Documento vivo** del incidente (Google Doc / Notion / md compartido) con timeline.
- Acceso SSH/panel Hostinger del IC y tech lead.
- Credenciales de B2 (para restore si es necesario).
- Lista de contactos: owners de cada local activo + canal con autoridad si aplica.

## Drill anual

Tabletop annual de incident response — ver [`runbook/drills/`](../runbook/drills/).

Escenario ejemplo: "El owner de Pizza Bambino te llama el sábado a las 11pm. Dice que el menú de Pizza Bambino muestra los productos de Tacos El Gordo. ¿Qué haces?"

## Post-incidente

- Postmortem (obligatorio).
- Implementar action items críticos.
- Revisar este documento — ¿hubo paso que no estaba? Añadirlo.
- Compartir aprendizajes con todo el equipo.

## Referencias

- [LFPDPPP México](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) — texto oficial.
- [NIST SP 800-61r2 — Computer Security Incident Handling Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf).
- [INAI — Guía para responder ante incidentes de seguridad](https://home.inai.org.mx/).
