# Pre-commit hooks (opcional pero recomendado)

> Atrapa errores **antes** del push para no romper CI ni mover el ciclo. Cada dev decide instalarlos en su máquina; no se versionan obligatorios.

## Por qué

- Push sin tests → CI rompe → roll-back → tiempo perdido del equipo.
- Commit con `dd()` o `console.log` → llega a prod si nadie lo nota en review.
- `.env` con secretos commiteado accidentalmente → leak.
- Whitespace / trailing newlines inconsistentes en diffs.

Los hooks corren antes del commit y bloquean si encuentran algo.

## Opciones

### Opción A — Lefthook (recomendado: rápido, declarativo, una sola config)

[Lefthook](https://github.com/evilmartians/lefthook) — escrito en Go, sin dependencias, paralelo.

```bash
# Mac
brew install lefthook

# Otros
go install github.com/evilmartians/lefthook@latest

# En la raíz del repo
lefthook install
```

Config sugerida — `lefthook.yml` en la raíz (a crear si no existe):

```yaml
pre-commit:
  parallel: true
  commands:

    # ─── PHP ───
    pint:
      glob: "apps/api/**/*.php"
      run: cd apps/api && vendor/bin/pint --test --dirty
      stage_fixed: true

    php-syntax:
      glob: "apps/api/**/*.php"
      run: php -l {staged_files}

    # ─── TypeScript / React ───
    typecheck:
      glob: "apps/web/**/*.{ts,tsx}"
      run: cd apps/web && npm run typecheck

    eslint:
      glob: "apps/web/**/*.{ts,tsx,js,jsx}"
      run: cd apps/web && npx eslint --fix {staged_files}
      stage_fixed: true

    # ─── Bash ───
    shellcheck:
      glob: "scripts/*.sh"
      run: shellcheck {staged_files}

    # ─── Seguridad ───
    no-debug-statements:
      glob: "apps/{api,web}/**/*.{php,ts,tsx}"
      run: |
        if grep -nE '(^|[^a-zA-Z_])(dd|var_dump|dump|console\.log)\(' {staged_files}; then
          echo "❌ Encontré dd()/var_dump()/console.log() en archivos staged"
          echo "   Quitar antes de commit"
          exit 1
        fi

    no-env-leak:
      glob: "*"
      run: |
        BAD=$(echo "{staged_files}" | tr ' ' '\n' | grep -E '(^|/)\.env$|(^|/)\.env\.local$' || true)
        if [[ -n "$BAD" ]]; then
          echo "❌ Estás intentando commitear un .env real:"
          echo "$BAD"
          exit 1
        fi

    gitleaks:
      run: gitleaks protect --staged --redact -v
```

Bypass de emergencia (raro — usar sólo cuando el hook esté roto):
```bash
LEFTHOOK=0 git commit -m "..."
```

### Opción B — Husky (más popular, pero requiere npm)

[Husky](https://typicode.github.io/husky/) — el clásico.

```bash
cd apps/web   # debe estar instalado en el proyecto con npm
npx husky init
```

Esto crea `.husky/pre-commit`. Editar:

```bash
#!/usr/bin/env sh

# php (sólo si tocaste apps/api)
if git diff --cached --name-only | grep -q "^apps/api/"; then
    (cd apps/api && vendor/bin/pint --test --dirty) || exit 1
fi

# typescript (sólo si tocaste apps/web)
if git diff --cached --name-only | grep -q "^apps/web/"; then
    (cd apps/web && npm run typecheck) || exit 1
fi

# shellcheck
SCRIPTS=$(git diff --cached --name-only | grep -E '^scripts/.*\.sh$' || true)
if [[ -n "$SCRIPTS" ]]; then
    shellcheck $SCRIPTS || exit 1
fi

# anti-debug
if git diff --cached --name-only --diff-filter=ACM | xargs grep -lE '(^|[^a-zA-Z_])(dd|var_dump|console\.log)\(' 2>/dev/null; then
    echo "❌ Quitar dd()/var_dump()/console.log()"
    exit 1
fi
```

### Opción C — pre-commit framework de Python

[pre-commit.com](https://pre-commit.com) — multi-lenguaje, ecosistema grande de hooks pre-construidos.

```bash
pip install pre-commit
pre-commit install
```

Config: `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/zricethezav/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: check-merge-conflict

  - repo: local
    hooks:
      - id: pint
        name: Laravel Pint
        entry: bash -c 'cd apps/api && vendor/bin/pint --test --dirty'
        language: system
        files: ^apps/api/.*\.php$
        pass_filenames: false

      - id: typecheck
        name: TS typecheck
        entry: bash -c 'cd apps/web && npm run typecheck'
        language: system
        files: ^apps/web/.*\.(ts|tsx)$
        pass_filenames: false
```

## Comparación

| Feature | Lefthook | Husky | pre-commit (Python) |
|---------|----------|-------|---------------------|
| Velocidad | 🟢 Más rápido (Go, parallel) | 🟡 Medio (Node) | 🟡 Medio (Python) |
| Setup | Brew/Go install | Requiere npm en repo | pip install |
| Config | YAML simple | Shell scripts en .husky/ | YAML con repos remotos |
| Hooks pre-construidos | 🟡 Tienes que escribirlos | 🟡 Tienes que escribirlos | 🟢 Grande catálogo |
| Cross-platform | 🟢 | 🟢 | 🟢 |
| Bypass | `LEFTHOOK=0` | `--no-verify` | `--no-verify` |

**Mi recomendación**: Lefthook si tienes Mac/Linux con Brew/Go, pre-commit si ya usas Python para otras cosas.

## ⚠️ Reglas

1. **Hooks NO reemplazan CI**. CI sigue siendo la verdad — los hooks son aceleradores.
2. **Hooks deben ser rápidos** (< 10s ideal, < 30s tolerable). Sino la gente los bypass-ea.
3. **Bypass con `--no-verify`** sólo en emergencias reales (hotfix de prod).
4. **No commitear .git/hooks/**. Los hooks viven via gestor (Lefthook/Husky/pre-commit).
5. **Documentar bypass** en el PR si fue usado.

## Checks que NO van en pre-commit (corren sólo en CI)

- `phpunit` completo — toma > 30s, frustra.
- `next build` completo — toma > 60s.
- `npm audit` — slow, se hace semanal.
- `gitleaks` full history scan — lento.

En pre-commit sólo los rápidos: lint, type-check, sintaxis, anti-debug.
