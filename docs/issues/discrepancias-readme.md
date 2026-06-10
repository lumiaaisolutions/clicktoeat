# Issues — Discrepancias entre README y código real

> Snapshot al 2026-06-10. Cada punto debe cerrarse: o **se ajusta el código** o se **corrige la documentación**.
>
> ✅ = cerrada · 🟡 = parcial · ❌ = abierta

## ✅ 1. Cloudinary mencionado pero no implementado

**Resolución (2026-06-10):**
- README raíz reescrito: ya no menciona Cloudinary; apunta a `docs/`.
- `.env.example` raíz: variables `CLOUDINARY_*` eliminadas, deja nota explícita.
- Decisión documentada en [`ADR-006`](../decisions/ADR-006-uploads-locales-interim.md): "interim disco local, migrar a Cloudinary/S3 cuando se vaya a producción multi-instancia".

Pendiente: la migración real cuando se decida el provider.

## ✅ 2. Roadmap desactualizado en README

**Resolución:** README raíz ya no contiene tabla de roadmap. El roadmap vivo y actualizado vive en [`docs/issues/roadmap.md`](roadmap.md).

## ✅ 3. Conteo de tests viejo

**Resolución:** README raíz no contiene cifras de tests. La lista actualizada vive en [`docs/testing/suites.md`](../testing/suites.md).

## ✅ 4. Tabla de endpoints del README incompleta

**Resolución:** README raíz no documenta endpoints individuales. Apunta a `docs/api/`:
- [`api/public.md`](../api/public.md)
- [`api/auth.md`](../api/auth.md)
- [`api/tenant.md`](../api/tenant.md)
- [`api/admin.md`](../api/admin.md)

## 🟡 5. Dump SQL desactualizado vs migraciones

**Resolución (parcial):**
- Añadido warning prominent al inicio de `bd/bdclicktoeat.sql` apuntando a migraciones como fuente de verdad.

Pendiente: decidir si se regenera el dump periódicamente o se elimina.

## ✅ 6. Nombre de la BD inconsistente

**Resolución (2026-06-10):** estandarizado en `clicktoeat`:
- `docker-compose.yml` → `clicktoeat` (BD, user y password).
- `docker/mysql/init.sql` → crea `clicktoeat` y `clicktoeat_testing`.
- `apps/api/config/database.php` → default `clicktoeat`.
- `apps/api/.env.example` → `clicktoeat`.

Para entornos Docker ya existentes con la BD vieja `clickeat`, ver [`runbook/rename-db-clickeat-a-clicktoeat.md`](../runbook/rename-db-clickeat-a-clicktoeat.md).

## 🟡 7. `APP_KEY` commiteado

**Resolución (parcial):**
- Verificado que `.gitignore` excluye `.env`.
- `apps/api/.env.example` ya tiene `APP_KEY=` vacío.
- Runbook creado: [`runbook/rotar-app-key.md`](../runbook/rotar-app-key.md).

**Pendiente operativo** (el equipo decide):
- Rotar la `APP_KEY` actual.
- Cuando este proyecto pase a un repo Git real, verificar con `git ls-files | grep .env` que el archivo no esté trackeado.

## ✅ 8. `spatie/laravel-permission` declarada sin uso

**Resolución (2026-06-10):**
- Eliminada del `composer.json`.
- Eliminado el alias `role` del middleware en `bootstrap/app.php`.

**Pendiente operativo:** ejecutar `composer update spatie/laravel-permission --no-scripts` para sincronizar `composer.lock`. Ver [`runbook/sincronizar-composer-lock.md`](../runbook/sincronizar-composer-lock.md).

## ❌ 9. `NEXT_PUBLIC_GOOGLE_MAPS_KEY` declarado, mapa usa Leaflet

`.env.local` y `.env.production` del frontend tienen `NEXT_PUBLIC_GOOGLE_MAPS_KEY=...`, pero la implementación del mapa usa **Leaflet** (gratis, sin API key).

**Pendiente:**
- Confirmar que la variable realmente no se lee en código (ya verificado: no aparece en `apps/web/src/`).
- Eliminar de ambos archivos `.env*`.

## ✅ 10. Decisión multi-tenant en README ambigua

**Resolución:** explicación completa en [`docs/architecture/multi-tenancy.md`](../architecture/multi-tenancy.md) y formalizada en [`ADR-001`](../decisions/ADR-001-single-db-tenancy.md). El README raíz linkea a ambos.

---

## Resumen de cambios del 2026-06-10

| #  | Estado  | Acción tomada                                                                   |
|----|---------|---------------------------------------------------------------------------------|
| 1  | ✅      | README + .env.example limpios; ADR-006 documenta interim                          |
| 2  | ✅      | Roadmap movido a `docs/issues/roadmap.md`                                        |
| 3  | ✅      | Cifras de tests salidas del README; viven en `docs/testing/suites.md`             |
| 4  | ✅      | Endpoints documentados por grupo en `docs/api/`                                    |
| 5  | 🟡      | Warning en el dump SQL; regeneración pendiente                                    |
| 6  | ✅      | BD estandarizada en `clicktoeat`; runbook de migración disponible                |
| 7  | 🟡      | Runbook creado; rotación real es decisión operativa                                |
| 8  | ✅      | Spatie removida; runbook de sync de composer.lock disponible                       |
| 9  | ❌      | Pendiente limpiar variable de Google Maps                                          |
| 10 | ✅      | ADR-001 formaliza la decisión                                                     |
