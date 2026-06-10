# Drill — `<tipo de drill>` — `<fecha>`

> **Date**: YYYY-MM-DD
> **Facilitador**: @nombre
> **Participantes**: @n1, @n2, @n3
> **Runbook ejercitado**: [`<archivo>.md`](../<archivo>.md)
> **Duración total**: XX min
> **Resultado**: ✅ Exitoso | 🟡 Exitoso con observaciones | ❌ Falló

## Objetivo

Una frase: qué queríamos validar.

> Ejemplo: "Verificar que el backup del día anterior se puede restaurar en menos de 2h y los datos están íntegros."

## Setup

- **Entorno**: VPS efímero / container Docker local / staging.
- **Recursos usados**: backup `clicktoeat-20260710T030000Z.sql.gz` (3.2 GB comprimido).
- **Estado inicial**: ambiente limpio sin datos previos.

## Procedimiento ejecutado

| Paso | Tiempo | Acción | Resultado |
|------|--------|--------|-----------|
| 1 | 00:00 | Descargar dump de B2 (`rclone copy ...`) | ✅ 3.2 GB en 90s |
| 2 | 00:01:30 | Verificar sha256 contra manifest | ✅ match |
| 3 | 00:01:35 | Descomprimir | ✅ 18 GB descomprimido |
| 4 | 00:02:00 | `mysql -u root ... < dump.sql` | ✅ 22 min |
| 5 | 00:24:00 | Validaciones (count + integrity) | ✅ todos los counts coinciden con manifest |
| 6 | 00:25:00 | Smoke test funcional (login + endpoint público) | ✅ 200 OK |

## Resultado

- **Tiempo total**: 25 min (objetivo SLO: < 2h ✅).
- **Integridad**: todas las queries de verificación pasaron.
- **Funcional**: login + endpoint público respondieron correctamente.

## Hallazgos

Cosas que aprendimos / que requieren acción:

- 🟡 **Hallazgo 1**: El runbook decía `gunzip -k` (mantiene comprimido + descomprime) pero `-k` no existe en todas las versiones de gunzip — usar `gunzip < x.gz > x.sql` es más portable.
- ✅ **Hallazgo 2**: El manifest sha256 funciona — detectaríamos corrupción.

## Action items

| # | Acción | Owner | Fecha | Status |
|---|--------|-------|-------|--------|
| 1 | Actualizar `restaurar-backup-mysql.md` con comando portable de gunzip | @persona | YYYY-MM-DD | Open |
| 2 | Agendar próximo drill | @persona | YYYY-MM-DD | Open |

## Recomendaciones generales

- Próximo drill: probar restore parcial (sólo `pedidos`) en vez de full.
- Considerar tener el dump descomprimido también en B2 para ahorrar el paso de descompresión.
