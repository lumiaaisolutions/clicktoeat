# Colección HTTP

Peticiones de prueba para los endpoints de la API. Compatibles con:

- **VS Code REST Client** (extensión `humao.rest-client`)
- **JetBrains HTTP Client** (PhpStorm, IntelliJ, WebStorm) — built-in
- **Cualquier cliente** que soporte el formato `.http` / `.rest`

## Archivos

| Archivo | Cubre |
|---------|-------|
| [`auth.http`](auth.http) | `/auth/*` — register, login, me, logout, change password |
| [`public.http`](public.http) | `/public/*` — locales, menú, crear pedido público con extras |
| [`tenant.http`](tenant.http) | Endpoints autenticados del owner (branding, catálogo, pedidos, inventario, métricas) |
| [`admin.http`](admin.http) | Endpoints super_admin (CRUD locales, suspender, reset password owner) |

## Variables de entorno

Cada archivo lee variables desde un bloque `@variable = valor` al inicio. Puedes:

### Opción A — Editar el archivo directamente

Cambiar `@token = <pega-aqui>` con un token real.

### Opción B — Usar variables del cliente (recomendado)

#### VS Code REST Client
Crea `.vscode/settings.json` o `~/Library/Application Support/Code/User/settings.json`:

```json
{
  "rest-client.environmentVariables": {
    "local": {
      "host": "http://localhost:8080/api/v1",
      "token": ""
    },
    "production": {
      "host": "https://clicktoeat-api.lumiaaisolutions.com/api/v1",
      "token": ""
    }
  }
}
```

Y abajo a la derecha del editor, selecciona el environment activo.

#### JetBrains HTTP Client
Crear `http-client.private.env.json` (gitignored) en `docs/api/http-requests/`:

```json
{
  "local": {
    "host": "http://localhost:8080/api/v1",
    "token": ""
  },
  "production": {
    "host": "https://clicktoeat-api.lumiaaisolutions.com/api/v1",
    "token": ""
  }
}
```

Y elige el entorno desde el dropdown del run.

## Flujo típico de uso

1. Abrir [`auth.http`](auth.http).
2. Ejecutar **login** con credenciales demo (`owner+tacos-el-gordo@ClickToEat.app` / `password123`).
3. Copiar el `token` de la respuesta.
4. Setearlo en `@token` (o en el env del cliente).
5. Ir a [`tenant.http`](tenant.http) y empezar a probar endpoints autenticados.

## Convenciones

- `###` separa requests (separador estándar).
- `@nombre = valor` define variables.
- `{{var}}` referencia variable.
- Comentarios con `#`.
- Heredocs JSON en línea con el body.

## Endpoints públicos no documentados aquí

- `GET /api/documentation` — Swagger UI (en navegador).
- `GET /api/docs.json` — OpenAPI spec.

## Cómo NO usar esta colección

- ❌ No commitear tokens reales en estos archivos. Usa el env del cliente.
- ❌ No correr peticiones destructivas (`DELETE`, `POST /admin/...`) contra producción sin doble check.
- ❌ No usar credenciales productivas para probar.

## Setup contra producción

Para probar contra `https://clicktoeat-api.lumiaaisolutions.com`:

1. Pedir al equipo un user de test productivo (NO usar las cuentas demo de seeders en prod).
2. Cambiar `@host` al de prod.
3. Login → guardar token.
4. Limitar pruebas a `GET`s (lectura) o crear/borrar sólo recursos de un local de prueba.

> Tokens productivos NUNCA en repos versionados.
