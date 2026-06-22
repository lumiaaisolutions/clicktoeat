# Setup de pre-commit hooks (cierra SEV-18 del audit)

> Hook local que escanea cada commit en busca de secretos antes de que lleguen
> al repo. Es la primera red — si falla, el CI tiene una segunda red con
> gitleaks-action en `.github/workflows/security.yml`.

## Por qué

El audit 2026-06-19 (SEV-18) pidió tres cosas para cerrar la cadena de
suministro:

1. ✅ Dependabot — auto-PRs de actualizaciones (commit `91979c7`).
2. ✅ npm audit signatures en CI (commit `60107e3`).
3. ✅ SBOM CycloneDX por release (`.github/workflows/sbom.yml`, commit este).
4. ✅ Pre-commit gitleaks (este runbook).

## Instalación (una vez por dev)

```bash
# macOS
brew install pre-commit

# Linux / cualquiera con pip
pip install --user pre-commit
```

Una vez instalado, en la raíz del repo:

```bash
cd /Users/fernandotorres/Desktop/LUMIA/clicktoeat
pre-commit install
```

Eso registra el hook en `.git/hooks/pre-commit`. A partir de ahora, cada
`git commit` corre los checks definidos en `.pre-commit-config.yaml`.

## Qué cataría en cada commit

1. **gitleaks --staged**: si en el diff aparece algo que parece secreto
   (regex de Stripe `sk_`, GitHub `ghp_`, AWS `AKIA`, etc.), el commit
   se bloquea. Para casos legítimos (test fixtures), agrégalos al
   allowlist en `.github/gitleaks.toml`.

2. **check-merge-conflict**: falla si hay `<<<<<<<` sin resolver.
3. **check-added-large-files**: bloquea archivos > 500 KB (típicamente
   binaries pegados por error).
4. **check-json / check-yaml**: valida sintaxis básica.
5. **end-of-file-fixer / trailing-whitespace**: higiene.

## Bypass intencional (emergencia)

Si necesitas saltar el hook puntualmente:

```bash
git commit --no-verify -m "..."
```

Esto NO te exime del CI (`.github/workflows/security.yml`) que corre
gitleaks-action al push. Si commit un secret y bypass el hook local, te
catan en GitHub Actions y el PR queda bloqueado.

## Validar la instalación

```bash
# Corre todos los hooks contra todo el repo (no solo staged):
pre-commit run --all-files

# Esperado: cero failures (excepto warnings de archivos pre-existentes).
```

## Para el CI

Hay también un workflow `.github/workflows/security.yml` que corre
gitleaks via action en cada push. El pre-commit es la PRIMERA red
(catch local antes de git push); el CI es la SEGUNDA red.

## Si el hook falla

- **gitleaks dice "potential secret found"**: revisa el match. Si es
  falso positivo (test fixture), agrégalo al `.github/gitleaks.toml`
  con `allowlist.regexes`. Si es real, **NO** lo commitees — rota el
  secret y borra del staging.
- **check-yaml falla**: probablemente sintaxis inválida en un workflow
  o config. Mira el error específico.

## Roadmap futuro

Cuando el equipo crezca, considerar agregar al pre-commit:
- `pint` (PHP-CS-Fixer wrapper de Laravel) para auto-format del backend
- `prettier` para auto-format del frontend
- `phpstan` para static analysis del backend
- `tsc --noEmit` para typecheck del frontend

Por ahora solo gitleaks + higiene básica — minimizar fricción.
