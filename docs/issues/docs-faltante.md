# Issues — Documentación faltante

> Lista de docs que aún hace falta crear (o ampliar). Cuando se cierre uno, mover a la sección correspondiente del índice (`docs/README.md`).

## Críticos

- `docs/contributing/how-to-add-feature.md` — paso a paso desde "tengo una idea" hasta "PR merged". Pendiente.
- `docs/contributing/git-flow.md` — flujo de ramas, nombres de commits, convenciones de PRs. Pendiente.
- `docs/infra/deploy.md` — el archivo existe pero está marcado como TODO; hace falta documentar el deploy real cuando se acuerde el flujo.
- `docs/architecture/decisions/` — un ADR por decisión grande (snake vs camel en API, single DB vs schema-per-tenant, bearer vs cookie, etc.).

## Documentación de runtime

- `docs/runbook/` no existe — qué hacer cuando algo se rompe:
  - BD lentitud / lock contention.
  - Cache corrupto.
  - Crash de queue worker (cuando existan).
  - Restore desde backup.
  - Rotación de APP_KEY.
  - Permisos de storage.

## Documentación de usuario / cliente final

- Guía para owners: "cómo subir productos", "cómo configurar horarios", "cómo entender métricas". Pendiente, probablemente en `docs/user-guides/` o como markdown rendereado dentro del admin.

## Documentación interna

- `docs/security/`:
  - Threat model.
  - Inventario de datos sensibles (PII de clientes, contraseñas, tokens).
  - Política de retención.
  - Política de incidentes.
- `docs/api/openapi.json` (snapshot) o linkear el Swagger generado en cada release.

## Diagrams

- Diagramas como imagen (PNG/SVG) además del texto:
  - `docs/database/erd.svg` generado con dbdiagram.io o mermaid.
  - `docs/architecture/sequence-pedido.png` para el flujo del pedido público.

## Cosas que ahora viven sólo en código y deberían tener .md propio

- **TenantContext** (singleton + scope + concern) → ya documentado en [`architecture/multi-tenancy.md`](../architecture/multi-tenancy.md). ✅
- **HorarioCalculator** → ya documentado en [`features/horarios.md`](../features/horarios.md). ✅
- **Format de WhatsApp espejado PHP/TS** → ya documentado en [`features/whatsapp.md`](../features/whatsapp.md). ✅
- **Patrón `referencia` de MovimientoInventario** → ya documentado en [`features/inventario.md`](../features/inventario.md) y [`database/erd.md`](../database/erd.md). ✅
- **Promedio ponderado de costo** → ya documentado en [`features/compras.md`](../features/compras.md). ✅
- **Snapshot en detalle_pedidos** → ya documentado en [`features/pedidos.md`](../features/pedidos.md) y [`models/detalle-pedido.md`](../models/detalle-pedido.md). ✅

## Documentación por release

- No hay **CHANGELOG.md**. Convención sugerida: [Keep a Changelog](https://keepachangelog.com).
- No hay **release notes** por versión.
- No hay **migration guide** entre versiones (cuando rompamos API).

## A revisar y refrescar periódicamente

| Doc                                          | Cuándo revisar                                       |
|---------------------------------------------|------------------------------------------------------|
| `docs/api/*.md`                              | Cada vez que se agregue/elimine endpoint              |
| `docs/database/schema.md`                    | Cada migración                                        |
| `docs/database/migrations.md`                | Cada migración                                        |
| `docs/testing/suites.md`                     | Cada test añadido                                     |
| `docs/issues/funcionalidad-faltante.md`      | Cada sprint                                            |
| `docs/issues/roadmap.md`                     | Cada release                                           |
| `docs/issues/discrepancias-readme.md`        | Cada PR que ajuste README o código relacionado         |
