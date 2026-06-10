# API — Overview

## Base URL

| Entorno     | URL                                                       |
|-------------|-----------------------------------------------------------|
| Local Docker| `http://localhost:8080/api/v1`                            |
| Local nativo (Artisan)| `http://127.0.0.1:8080/api/v1`                  |
| Producción  | `https://clicktoeat-api.lumiaaisolutions.com/api/v1`      |

Prefijo `api/v1` es global, configurado en `bootstrap/app.php`.

## Documentación generada (Swagger / OpenAPI)

L5-Swagger se regenera en cada request (`L5_SWAGGER_GENERATE_ALWAYS=true` en dev).

- UI: `http://localhost:8080/api/documentation`
- Spec JSON: `http://localhost:8080/api/docs.json`

Cada controller usa anotaciones `@OA\*` para describirse. Mantener los docblocks al día.

## Formato de petición/respuesta

- **Content-Type**: `application/json` (excepto `uploads/image` → `multipart/form-data`).
- **Charset**: UTF-8.
- **Idioma**: las llaves JSON están en **español snake_case** (`cliente_nombre`, `metodo_entrega`). Algunas respuestas públicas (MenuController) usan **camelCase** para encajar con el frontend (`metodosPago`, `colorPrimario`). Inconsistencia consciente, ver [`api/conventions.md`](conventions.md).
- **Fechas**: ISO-8601 con offset (`2026-06-10T15:23:00-06:00`).

## Autenticación

Bearer token Sanctum:

```
Authorization: Bearer <token>
```

Cómo obtener el token: `POST /auth/login`. Ver [`api/auth.md`](auth.md).

## Headers recomendados

- `Accept: application/json` — siempre. Sin esto Laravel puede devolver HTML.
- `X-Requested-With: XMLHttpRequest` — el frontend lo manda. Ayuda a que Laravel detecte la naturaleza AJAX.

## Códigos de respuesta

| Código | Significado                                |
|-------|--------------------------------------------|
| 200   | OK                                          |
| 201   | Created                                     |
| 204   | No Content (DELETE, logout)                |
| 401   | No autenticado                              |
| 403   | Autenticado pero sin permiso o sin local    |
| 404   | Recurso no encontrado                       |
| 409   | Conflicto (stock insuficiente, dependencias) |
| 422   | Validación fallida                           |
| 429   | Rate limit                                   |
| 500   | Error de servidor                            |

Ver [`api/errors.md`](errors.md) para forma exacta del cuerpo.

## Grupos de rutas

| Grupo                | Path prefix      | Middleware                    | Quién                        |
|---------------------|------------------|-------------------------------|------------------------------|
| Público              | `/public/*`       | sólo throttle                 | Anónimo                       |
| Auth                 | `/auth/*`         | mezcla (login pública, me/logout/password con sanctum) | Quien sea / autenticado |
| Tenant-scoped        | `/dashboard`, `/local/*`, `/categorias`, `/productos`, `/pedidos`, etc. | `auth:sanctum` + `tenant`     | owner, staff                  |
| Super admin          | `/admin/*`         | `auth:sanctum` + `super_admin`| super_admin                   |

Detalle por grupo:
- [`api/public.md`](public.md)
- [`api/auth.md`](auth.md)
- [`api/tenant.md`](tenant.md)
- [`api/admin.md`](admin.md)
