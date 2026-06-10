# CI/CD — GitHub Actions

> Workflows en `.github/workflows/`. Activos cuando el repo se sube a GitHub. Mientras tanto, los archivos están listos.

## Workflows

| Archivo | Cuándo corre | Para qué |
|--------|--------------|----------|
| [`ci.yml`](../../.github/workflows/ci.yml) | PR + push a `main` | Tests, lint, type-check, build, shellcheck |
| [`openapi-snapshot.yml`](../../.github/workflows/openapi-snapshot.yml) | PR que toca controllers + manual | Regenera `docs/api/openapi.json` y abre PR si difiere |
| [`security.yml`](../../.github/workflows/security.yml) | Semanal (lunes 09:00 UTC) + PR a deps + manual | Gitleaks + composer audit + npm audit + .env leak check |

## `ci.yml` — checks por PR

3 jobs paralelos + 1 final que agrega resultados:

### Job `api` (Laravel)
- Detecta si `apps/api/**` cambió (skip si no).
- PHP 8.3 + extensiones (`pdo_sqlite`, `mbstring`, `intl`, `bcmath`, `zip`, `gd`).
- Cache de `vendor/` por hash de `composer.lock`.
- `composer install` → `composer validate --strict` → `pint --test` → `phpunit` (sqlite in-memory).
- Timeout 10 min.

### Job `web` (Next.js)
- Detecta si `apps/web/**` cambió.
- Node 20 + cache de `node_modules`.
- `npm ci` → `tsc --noEmit` → `next lint` → `next build` (con URLs de prod para validar).
- Timeout 10 min.

### Job `scripts` (Bash)
- Detecta si `scripts/**` cambió.
- `shellcheck` con severidad warning.
- Timeout 5 min.

### Job `ci-passed` (aggregator)
- Depende de los 3 anteriores.
- Falla si alguno falló (no si skipearon por no-cambios).
- Es el único check que se debe marcar como **required** en branch protection rules.

## `openapi-snapshot.yml`

Auto-disparado cuando hay PRs que tocan `apps/api/app/Http/Controllers/**` (donde viven las anotaciones `@OA\*`):

- Regenera el spec con `php artisan l5-swagger:generate`.
- Compara con `docs/api/openapi.json` versionado.
- **Si difiere y es PR**: falla con mensaje sugiriendo correr el workflow manual.
- **Si difiere y es `workflow_dispatch`**: abre PR automático `chore/openapi-snapshot` con el snapshot actualizado.

Razón del split: PRs no deberían crear otros PRs automáticamente (loops, ruido). El humano que mergea aprueba el snapshot.

Ver [`docs/api/openapi-snapshot.md`](../api/openapi-snapshot.md) para la política completa.

## `security.yml`

4 jobs:

### `gitleaks`
- Escanea el repo completo (full history) buscando secretos commiteados.
- Config en `.github/gitleaks.toml` (allowlist de archivos example, placeholders, demo creds).
- Falla el job si encuentra algo no en allowlist.

### `composer-audit`
- `composer audit --no-dev` sobre `apps/api/`.
- Falla en vulnerabilidades **HIGH** o **CRITICAL**.

### `npm-audit`
- `npm audit --omit=dev --audit-level=high` sobre `apps/web/`.
- Falla en vulnerabilidades **HIGH** o **CRITICAL**.

### `env-leak-check`
- `git ls-files | grep -E '^\.env$|\.env\.local$'` → debe devolver vacío.
- Verifica que `apps/web/.env.production` solo tenga `NEXT_PUBLIC_*` o `NODE_ENV`.

## Secrets necesarios en GitHub

Para que los workflows funcionen, ir a **Settings → Secrets and variables → Actions** y configurar:

| Secret | Para qué | Workflow |
|-------|----------|----------|
| `GITHUB_TOKEN` | Auto-provisto por GitHub. Sólo necesario que tenga `contents:write` + `pull-requests:write` permisos (declarado en cada workflow). | `openapi-snapshot` |

> No hay secrets de deploy aún — Fase 5 sólo cubre CI. El deploy automatizado se haría agregando un workflow `deploy.yml` con SSH key del servidor Hostinger (secret `HOSTINGER_SSH_KEY`).

## Pendiente para Fase 5 (no incluido aún)

- `deploy.yml` — workflow de deploy automatizado a Hostinger via SSH.
- Branch protection rules en GitHub (require `ci-passed` antes de mergear a `main`).
- Required reviewers (al menos 1 aprobación).
- Lockfile checks (detect lockfile out of sync).

## Cómo añadir un workflow nuevo

1. Crear `.github/workflows/<nombre>.yml`.
2. Validar sintaxis localmente con [actionlint](https://github.com/rhysd/actionlint) o el linter de tu editor.
3. Pushear a un branch de feature → ver el run en GitHub Actions.
4. Iterar hasta que pase.
5. Documentar en este archivo.

## Cómo debuggear un workflow que falla

1. Abrir el run en GitHub Actions.
2. Click en el job que falló → ver logs.
3. Si falló por timeout: incrementar `timeout-minutes` o optimizar el step.
4. Si falló por cache miss: validar que `hashFiles(...)` apunta al archivo correcto.
5. Si falló por permisos: validar `permissions:` del workflow.

### Logs raros / cosas obvias

- `composer install` falla con "your lock file does not contain a compatible set of packages" → correr `composer update` y commitear el lock actualizado.
- `next build` falla con "Cannot find module" → revisar que el import path use `@/` y no relative path que no existe en producción.
- `phpunit` falla en sqlite pero pasa en mysql → migración con SQL específico de MySQL sin guard `getDriverName()`. Ver [`docs/database/migrations.md`](../database/migrations.md).

## Cómo correr los checks **localmente** antes de pushear

Mismo conjunto que ejecuta CI:

```bash
# Backend
cd apps/api
composer install
composer validate --strict
vendor/bin/pint --test
vendor/bin/phpunit

# Frontend
cd apps/web
npm ci
npm run typecheck
npm run lint
npm run build

# Scripts
shellcheck scripts/*.sh
```

Ver también [`pre-commit.md`](pre-commit.md) para automatizarlo con hooks.
