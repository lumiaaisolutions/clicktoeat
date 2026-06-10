# API — Snapshot OpenAPI

## Qué

L5-Swagger genera dinámicamente el spec OpenAPI 3.0 leyendo las anotaciones `@OA\*` de los controllers. Está expuesto en:

- **UI Swagger**: `http://localhost:8080/api/documentation`
- **Spec JSON**: `http://localhost:8080/api/docs.json`
- **Archivo generado en disco**: `apps/api/storage/api-docs/api-docs.json` (cuando se corre `php artisan l5-swagger:generate`)

## Por qué versionarlo en docs/

El spec dinámico es **inestable**: cambia con cada PR que toca anotaciones. Para tener un punto de referencia estable:

- **Onboarding**: un dev puede importar el spec a Postman/Insomnia sin levantar Docker.
- **Integraciones externas**: terceros pueden consumir el spec sin pegarle al endpoint vivo.
- **Diff visible en revisiones de PR**: cambios al contrato salen explícitos.
- **Documentación de releases**: cada tag debería tener un snapshot consistente.

## Política

- Generar **antes de cada release** (`0.X.0`) y commitear en `docs/api/openapi.json`.
- Generar también cuando un PR cambie significativamente la API (endpoints nuevos, breaking changes en shape de respuesta).
- En CI: validar que el spec generado en HEAD coincide con el versionado (`git diff --exit-code docs/api/openapi.json`). Si difieren, fail.

## Cómo se genera (referencia — lo ejecuta el CI)

El comando que el pipeline corre dentro de la imagen oficial:

```bash
php artisan l5-swagger:generate \
  && cp storage/api-docs/api-docs.json /workspace/docs/api/openapi.json
```

Los devs **no** deben ejecutarlo en su máquina local. Si necesitas inspeccionar el spec en dev, usa el endpoint vivo:

- `http://localhost:8080/api/documentation` (Swagger UI)
- `http://localhost:8080/api/docs.json` (spec JSON)

## Versión consumible por terceros

Para consumir el spec desde un Postman / Insomnia / OpenAPI generator:

1. Import → File → `docs/api/openapi.json`.
2. Setear variable `base_url` = `http://localhost:8080/api/v1` (dev) o el dominio prod.
3. Para endpoints autenticados, setear header `Authorization: Bearer <token>`.

## Generación autoritativa: sólo en CI

**Decisión**: el archivo `docs/api/openapi.json` se regenera **exclusivamente por el pipeline de CI/CD** corriendo dentro del contenedor oficial. No se genera en máquinas locales (cada dev podría tener una versión de PHP / vendor distinta y producir un spec sutilmente diferente).

### Jobs esperados (a configurar en Fase 5)

1. **PR check** (`.github/workflows/ci.yml`):
   - Job `openapi-drift`: corre `php artisan l5-swagger:generate` dentro de la imagen oficial, compara con `docs/api/openapi.json`. Si difieren → fail con mensaje sugiriendo regenerar.
2. **Release** (`.github/workflows/release.yml` o tag-triggered):
   - Job `regenerate-openapi`: regenera, hace commit a una rama temporal y abre PR automático con el cambio.
   - Adjunta el JSON como release asset.

### Por qué NO generarlo local

- **Determinismo**: misma imagen Docker + mismo vendor lockeado = mismo output.
- **Sin contaminación** del repo con artefactos sucios (alguien genera localmente con un PHP minor diferente y mete un diff espurio).
- **Auditabilidad**: cada cambio del spec queda en un PR atribuido al pipeline.

### TODO operativo

- [ ] Implementar los dos jobs en Fase 5 (CI/CD).
- [ ] Definir si el primer snapshot lo crea un release inicial (preferido) o un commit manual del primer responsable del CI.

## Alternativa: colección `.http`

Para los devs que prefieren probar endpoints desde el editor (VS Code REST Client, JetBrains HTTP client), hay una colección de archivos `.http` con peticiones listas. Ver [`docs/api/http-requests/README.md`](http-requests/README.md) (creado en Fase 4 del plan de mejoras).

## Por qué L5-Swagger y no Scribe / otros

- **L5-Swagger** (`darkaonline/l5-swagger`) wrappea `zircote/swagger-php`, lee anotaciones `@OA\*` y produce OpenAPI 3.0.
- **Scribe** (`knuckleswtf/scribe`) genera docs de manera más mágica (introspectando rutas/requests), pero produce HTML estático y es menos amigable para integraciones programáticas.
- L5-Swagger se eligió porque expone JSON spec consumible por cualquier tooling estándar (Postman, Insomnia, openapi-generator, redocly).
