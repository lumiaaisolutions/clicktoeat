# Infra — Despliegue

ClickToEat **ya está en producción** en Hostinger.

| Componente | URL                                                  |
|-----------|------------------------------------------------------|
| Frontend  | https://clicktoeat.lumiaaisolutions.com               |
| API        | https://clicktoeat-api.lumiaaisolutions.com           |

## Por dónde empezar

- **Documentación del setup productivo actual** (Hostinger): [`infra/deploy-hostinger.md`](deploy-hostinger.md).
- **Setup local de dev** (Docker): [`infra/local-setup.md`](local-setup.md).
- **Setup local nativo** (sin Docker): [`infra/wamp-native.md`](wamp-native.md).

## Pipeline de deploy (estado)

Hoy no hay pipeline automatizado documentado. Trabajo pendiente para **Fase 5** del plan de mejoras:

- GitHub Actions con jobs:
  - `ci` — phpunit + pint + tsc + eslint en PRs.
  - `openapi-snapshot` — regenera y valida `docs/api/openapi.json`.
  - `deploy-staging` — auto en push a `main`.
  - `deploy-production` — manual / tag-based, con aprobación.
- Estrategia de releases atómicos con rollback (`releases/` symlink pattern).
- Smoke tests post-deploy (endpoint público + login).

Ver:
- [`issues/devops-faltante.md`](../issues/devops-faltante.md) — punch list completa.
- [`issues/roadmap.md`](../issues/roadmap.md) — priorización.
- [`infra/deploy-hostinger.md`](deploy-hostinger.md) — todo lo que sé del deploy actual + lo que falta confirmar.

## Decisiones de hosting (histórico)

- **Hostinger** elegido por costo + facilidad de manejo para SaaS pequeño-mediano.
- Subdominios separados frontend/API → permite escalar uno sin tocar el otro, y mantener CORS estricto.
- Sin Docker en prod (probablemente) — Hostinger no garantiza Docker fuera de planes VPS premium. El docker-compose del repo es **sólo dev local**.

Cuando crezcamos lo suficiente para necesitar más, los caminos típicos:

| Trigger                                | Próximo step                                      |
|---------------------------------------|---------------------------------------------------|
| > 50 locales activos + uploads pesados | Migrar storage a S3/B2 + CDN                      |
| > 200 RPS sostenidos                  | Migrar BD a managed (RDS/PlanetScale)             |
| Necesidad de blue/green               | Migrar API a Fly.io / Railway / contenedores      |
| Equipo > 5 devs, deploys > 1 por día  | Pipeline automatizado obligatorio                  |
| Compliance (PCI / SOC2)                | Auditoría completa de infra                         |

Cada uno es un ADR que se escribe en su momento (`docs/decisions/`).
