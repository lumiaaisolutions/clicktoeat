# Contribución — Git flow

## Branch model

- **`main`** — siempre desplegable. Sólo merges desde PR aprobado.
- **`feat/<slug>`** — feature branch. Vida corta (días, no semanas).
- **`fix/<slug>`** — bug fix.
- **`docs/<slug>`** — sólo docs (este tipo de cambio).
- **`chore/<slug>`** — refactor menor, dependencias.

Ejemplos:
- `feat/cupones-publicos`
- `fix/inventario-doble-reintegro`
- `docs/api-tenant-endpoints`

## Mensajes de commit

Formato sugerido (no bloquear si no es estricto, pero apuntar):

```
<tipo>: <resumen corto en imperativo>

<cuerpo opcional con contexto>
```

Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`.

Ejemplo:
```
feat: agrega reintegro idempotente al cancelar pedidos

Lee movimientos con referencia=pedido:N:reintegro antes de actuar,
para que cancelar dos veces no duplique el stock.
```

Convencional cuando aplica, pero no estricto: lo importante es **describir el cambio en imperativo en español**.

## Antes de abrir PR

1. Rebase contra `main`: `git fetch origin && git rebase origin/main`.
2. Lint: `vendor/bin/pint && npm run lint && npm run typecheck`.
3. Tests: `vendor/bin/phpunit`.
4. Sin `dd()`, sin `console.log` huérfanos, sin secrets.
5. Si tocaste API → actualizar `docs/api/*.md`.
6. Si agregaste columna → actualizar `docs/database/schema.md`.
7. Si agregaste endpoint nuevo → tests para él.
8. Si cambiaste branding/UI → screenshot en el PR.

## Pull Request

- **Título**: imperativo, ≤ 72 chars.
- **Descripción**:
  - Qué hace y por qué.
  - Cambios visibles para el usuario.
  - Lista de archivos clave si el diff es grande.
  - Screenshots para cambios visuales.
  - Pendientes / TODOs si los hay.

Template sugerido:
```markdown
## Qué

<descripción 2-3 líneas>

## Por qué

<contexto del negocio o ticket>

## Cambios visibles

- [ ] Owner ahora puede X
- [ ] Endpoint Y devuelve Z

## Tests

- [ ] `feat/CuponesTest.php` cubre los casos felices y de límite.

## Notas

<TODO, deuda generada, etc.>
```

## Review

- Una aprobación mínima.
- Si tocaste auth, BD o multi-tenancy → **dos** aprobaciones idealmente (mayor blast radius).
- Si el PR cambia algo del README, asegurar que `docs/issues/discrepancias-readme.md` quede limpio.

## Merge

- Preferir **squash merge** para mantener `main` con historia legible (un commit = un PR).
- `git merge --no-ff` está bien si la rama tiene varios commits significativos que valen la pena conservar.
- **Nunca** force push a `main`.

## Hot-fix

Si hay un bug bloqueante en prod:
1. Branch desde `main`: `fix/<bug>`.
2. PR directo a `main`.
3. Después, mergear `main` a las features en curso para que no diverjan.

## Tags y release

- Hoy no hay tags. Cuando se decida convención semver: `v0.X.0` por release menor, `v0.X.Y` por patch.
- Crear `CHANGELOG.md` al introducir versiones formales.
