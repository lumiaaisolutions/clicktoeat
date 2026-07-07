# Postmortem — Trials vencidos con acceso ilimitado (gating dependía 100% de un cron roto)

> **Date of incident**: 2026-07-06
> **Authors**: @fernando
> **Status**: closed
> **Severity**: 🔴 SEV-1 (impacto en ingresos — cualquier trial manual vencido seguía operando gratis indefinidamente)

## TL;DR

Descubierto el 2026-07-06 mientras se investigaba si el cron maestro de
ClickToEat (`schedule:run`) realmente corría en producción: **nunca corrió**.
Como consecuencia, el comando `trials:expire-manual` — el único mecanismo que
cierra un trial manual vencido — jamás se ejecutó, y cualquier local en
`plan_status='trialing'` seguía con acceso completo al panel sin importar
cuántos días de retraso llevara ("Postres Cost.co Stitch" mostraba "Tu trial
termina en 0 días" y operaba con normalidad).

## Impacto

- **Servicios afectados**: todo el panel admin para locales con trial manual (asignado por super_admin, sin tarjeta capturada en Stripe).
- **Locales afectados**: potencialmente todos los que alguna vez entraron en `plan_status='trialing'` sin completar el checkout de Stripe — el gating nunca funcionó para ninguno desde que se implementó.
- **Ingresos no concretados (estimado)**: indeterminado, pero acumulativo — cada día que un trial vencido sigue operando sin bloqueo es un día de servicio gratis no facturado.
- **Detección**: no hubo alerta automática ni reporte de owner — se descubrió por casualidad, al verificar por qué un cron creado en otra tarea (ver postmortem `2026-07-06-locales-huerfanos-stripe.md`) no generaba logs.
- **Datos perdidos / filtrados**: no.

## Causa raíz

El diseño del gating de suscripción tiene **un solo mecanismo** para cerrar un
trial manual vencido, y es asíncrono/batch:

1. `Local::hasActivePlan()` (`apps/api/app/Models/Local.php`) devolvía `true`
   para cualquier `plan_status === 'trialing'`, **sin mirar `trial_ends_at`**.
2. `RequiresFeature` middleware y `AuthController::me()->is_active` dependen
   de `hasActivePlan()` — heredan el mismo hueco.
3. El frontend (`isPlanBlocking()` en `PlanInactiveScreen.tsx`) solo bloquea
   para status `incomplete`/`past_due`/`canceled` — nunca para `trialing`,
   sin importar `trial_ends_at`.
4. El único proceso que debía mover `plan_status` de `trialing` a
   `incomplete` al vencer el trial es `ExpireManualTrialsCommand`
   (`trials:expire-manual`), programado **exclusivamente** vía el Laravel
   Scheduler (`bootstrap/app.php`, `daily()->at('10:30')`).
5. El Scheduler solo corre si algo externo invoca `php artisan schedule:run`
   cada minuto — en Hostinger eso depende de un cron en hPanel. **Ese cron
   nunca estuvo bien configurado**: o no existía, o (como se descubrió al
   intentar crearlo) el ejecutor de cron de esta cuenta de Hostinger no pasa
   los comandos por una shell real, así que cualquier cron con sintaxis
   `cd X && comando` fallaba silenciosamente desde el primer token.

En resumen: **un solo punto de falla de infraestructura (un cron mal
configurado) desactivaba silenciosamente la única barrera de negocio que
impedía usar el producto gratis después del trial**, y nadie lo notó porque
no hay alerta que compare "trials vencidos" vs "trials realmente bloqueados".

## ¿Cómo se detectó?

- ❌ Alerta automática — no existía ninguna para esta clase de fallo.
- ✅ Casualidad / investigación de un problema no relacionado (verificando si
  el cron `locales:detect-orphan-stripe`, creado en el incidente de
  huérfanos del mismo día, realmente se ejecutaba).
- ❌ Reporte de owner.

## ¿Qué funcionó?

- El propio propietario del proyecto notó el "0 días" en la UI y preguntó
  directamente "¿qué pasa cuando se acaba el trial?" — sin esa pregunta, el
  hallazgo del cron roto se habría cerrado como "listo" sin exponer este
  problema mucho más caro.
- El fix de gating (chequeo en tiempo real de `trial_ends_at`) es
  independiente de arreglar el cron — cierra el hueco de negocio de
  inmediato, sin esperar a que la infraestructura de cron sea 100% confiable.

## ¿Qué falló o fue lento?

- Diseño con un solo punto de falla: toda la lógica de "¿está vencido el
  trial?" vivía solo en un job batch diario, sin ninguna verificación en
  tiempo real como respaldo.
- Sin alerta que hubiera detectado esto antes: por ejemplo, "N locales con
  `trial_ends_at` vencido hace más de 24h y `plan_status` todavía
  `trialing`" hubiera expuesto el problema el primer día que ocurrió.
- El cron de hPanel nunca se verificó end-to-end tras su creación original
  (el propio `docs/CONTINUAR.md` de sesiones anteriores afirmaba
  incorrectamente "el cron maestro ya está en hPanel" — documentación
  desactualizada o nunca verificada en la práctica).

## Causa raíz de infraestructura — ejecutor de cron de Hostinger sin shell

Diagnóstico completo (para referencia futura en cualquiera de los proyectos
de esta cuenta Hostinger, no solo ClickToEat):

1. Comando `cd /path && php artisan X >> log 2>&1` → error
   `timeout: failed to run command 'cd': No such file or directory` — el
   ejecutor intenta `execve("cd", ...)` directo, sin shell. `cd` no es un
   binario real, solo existe como builtin de shell.
2. Comando sin `cd` (`php /path/artisan X >> log 2>&1`) → error
   `No arguments expected for "schedule:run" command, got ">>"` — sin shell,
   `>>` y el resto se pasan como argv literales al comando de Artisan.
3. Comando envuelto en `/bin/sh -c '...'` → error `cd: too many arguments` —
   la capa de API de Hostinger no preserva correctamente el quoting anidado
   de una sola cadena larga con comillas internas.
4. **Solución que funcionó**: mover toda la lógica a un archivo `.sh` en el
   servidor (`~/cron-scripts/*.sh`, `chmod +x`) y que el comando del cron sea
   solo `/bin/sh /home/u221820910/cron-scripts/nombre.sh` — sin `&&`, sin
   `>>`, sin comillas anidadas. Verificado funcionando: `storage/logs/cron.log`
   ahora recibe "No scheduled commands are ready to run." cada minuto.

**Nota para otros proyectos en esta misma cuenta Hostinger** (ClickToDo,
ClickToBarber, ClickToShop): sus crons de `schedule:run` usan el mismo patrón
`cd X && php artisan schedule:run >> log` que fallaba aquí. No se verificaron
en esta sesión (fuera de alcance — son otros proyectos), pero si sufren el
mismo problema, sus schedulers tampoco estarían corriendo. Vale la pena
revisarlos con el mismo método (`hosting_getCronJobOutputV1` + verificar que
el archivo de log realmente crece).

## Acciones correctivas

| # | Acción | Owner | Fecha | Status | Link |
|---|--------|-------|-------|--------|------|
| 1 | `hasActivePlan()` chequea `trial_ends_at` en tiempo real para `plan_status='trialing'` — no depender solo del cron | @fernando | 2026-07-06 | ✅ Done | `apps/api/app/Models/Local.php` |
| 2 | `isPlanBlocking()` + `PlanInactiveScreen` bloquean `trialing` vencido (antes solo incomplete/past_due/canceled) | @fernando | 2026-07-06 | ✅ Done | `apps/web/src/components/billing/PlanInactiveScreen.tsx` |
| 3 | Cron maestro `schedule:run` de ClickToEat recreado con script `.sh` — confirmado corriendo cada minuto | @fernando | 2026-07-06 | ✅ Done | `~/cron-scripts/clicktoeat-schedule-run.sh` en servidor |
| 4 | Crons directos `audit-logs:purge` y `locales:purge` recreados con el mismo patrón de script — tenían el mismo bug de sintaxis | @fernando | 2026-07-06 | ✅ Done | `~/cron-scripts/clicktoeat-audit-purge.sh`, `clicktoeat-locales-purge.sh` |
| 5 | Revisar si ClickToDo/ClickToBarber/ClickToShop tienen el mismo bug de cron sin shell | — | — | Open | requiere revisar esos proyectos por separado |
| 6 | Alerta: "locales con `trial_ends_at` vencido hace >24h y `plan_status` aún `trialing`" (detectaría este problema aunque el cron vuelva a romperse) | — | — | Open | — |
| 7 | Test end-to-end periódico que confirme que `schedule:run` realmente se ejecutó (ej. checar `storage/logs/cron.log` mtime desde un healthcheck externo) | — | — | Open | — |

## Lecciones aprendidas

- **Nunca dejar que la única barrera de negocio dependa de un solo cron
  externo sin verificación.** Un chequeo en tiempo real como respaldo
  (aunque sea redundante con el batch job) convierte un fallo de
  infraestructura en un no-evento en vez de un incidente de ingresos.
- **"Está en el código" ≠ "está corriendo".** El comando, el modelo, los
  tests — todo existía y pasaba en CI. La brecha estaba 100% en
  infraestructura (un cron de hPanel), invisible desde el código o desde
  `git log`.
- **Verificar cron jobs en un proveedor de hosting compartido no es
  trivial** — el mensaje de error inicial (`cd: No such file or directory`)
  parecía cosmético/genérico y casi se descarta como ruido; resultó ser
  literal y exacto.
- **La documentación de sesiones anteriores puede estar equivocada** —
  `docs/CONTINUAR.md` afirmaba que el cron maestro ya estaba configurado.
  Verificar contra el estado real (hPanel, logs) antes de confiar en notas
  de handoff, por muy detalladas que parezcan.
- Preguntas simples del dueño del producto ("¿qué pasa cuando se acaba el
  trial?") destaparon un problema mucho más serio que la tarea original.

## Apéndice

- Verificación final: `cat storage/logs/cron.log` en prod muestra múltiples
  líneas `INFO No scheduled commands are ready to run.` — una por cada
  minuto que corrió sin tener tareas debidas en ese instante exacto.
- Suite completa `php artisan test` (265 tests) y `npm run typecheck` en
  verde tras el fix de gating.
- Relacionado: [`2026-07-06-locales-huerfanos-stripe.md`](2026-07-06-locales-huerfanos-stripe.md) — el incidente que llevó a descubrir este.
