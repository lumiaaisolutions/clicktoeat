# Contribución — Convenciones generales

## Idioma

- **Código y nombres de variables**: español + snake_case en backend (`metodo_entrega`, `cliente_nombre`); **camelCase** en frontend TypeScript (`metodoEntrega`, `clienteNombre`).
- **Comentarios y docstrings**: español.
- **Commits y PR descriptions**: español.
- **Documentación markdown**: español.
- **Mensajes de error al usuario**: español neutro.

## Estructura del repo

Una regla por encima de todas: **un tema = un archivo**.
- Si un controller crece, partirlo (sub-controllers o services).
- Si un componente React crece, partirlo.
- Si un `.md` cubre dos temas, dividirlo en dos archivos.

Ver [`feedback de memoria del proyecto sobre docs fragmentados`](../../README.md).

## Nomenclatura

| Capa             | Patrón                                       | Ejemplo                                   |
|-----------------|----------------------------------------------|-------------------------------------------|
| Tabla BD        | snake_case plural                            | `detalle_pedidos`                          |
| Modelo Eloquent | PascalCase singular                          | `DetallePedido`                            |
| Controller      | `<Nombre>Controller`                         | `PedidoController`                         |
| FormRequest     | `<Verbo><Nombre>Request`                     | `StorePublicPedidoRequest`                  |
| Resource        | `<Nombre>Resource`                            | `PedidoResource`                           |
| Policy          | `<Nombre>Policy`                              | `PedidoPolicy`                             |
| Service         | sustantivo (`OrderService`, `MetricasService`) — sin sufijo `Manager` |                 |
| Excepción       | `<Caso>Exception`                            | `InsufficientStockException`                |
| TS Type         | PascalCase, sin prefijo `I`                  | `interface AuthUser { ... }`                |
| TS Hook         | `use<Nombre>`                                | `useAuth`                                  |
| Componente React| PascalCase                                    | `ImageUpload`, `LeafletMap`                 |
| CSS class       | tailwind utilities; tema custom con `ce-` prefix | `bg-ink`, `text-muted`                  |

## Estado del API

- Nuevos endpoints van a una ruta tenant-scoped por default.
- Endpoints públicos requieren justificación (atacable).
- `apiResource` para CRUDs estándar; rutas manuales sólo cuando se desvían (ej. `recetas`, `compras`, ajustes).

## Form Requests

Toda validación pasa por un FormRequest. Nunca validar inline en el controller. `Model::unguard()` global te deja sin segunda red — depende **enteramente** del FormRequest.

## Resources

Toda respuesta JSON pasa por un Resource (snake_case) o un `MenuResource` público (camelCase). Nunca devolver el modelo crudo.

## Policies

Cada modelo expuesto tiene su Policy. Toda acción de controller (`show`, `update`, `delete`) tiene `$this->authorize(...)`. Las **listas** (`index`) usan `$this->authorize('viewAny', Modelo::class)`.

## Errores

- Errores de negocio → 409 con `{ message, faltantes?: [...] }`.
- Errores de validación → 422.
- Errores de autorización → 403 (lanza `AuthorizationException` o el middleware).
- Errores de auth → 401.
- Si capturas algo específico (ej. `InsufficientStockException`), siempre devuelve 409 con `faltantes`.

## Branches y commits

Ver [`git-flow.md`](git-flow.md).

## Tests

- Cualquier nuevo endpoint tenant-scoped debe tener al menos un test que verifique el **isolation** (owner A no ve datos de B).
- Cambios al `OrderService` o `InventoryService` requieren tests de transacción + rollback.
- Cambios al `WhatsAppLinkBuilder` requieren actualizar el espejo TS + test que matchee el formato.

## Reviews

- Revisar diff completo, no sólo el archivo.
- Verificar que la regla "un tema, un archivo" se respete.
- Si se agrega un endpoint, verificar que esté documentado en `docs/api/*.md` correspondiente.
- Si se agrega una columna, verificar `docs/database/schema.md`.
- Si se cambia branding/colors → smoke test en una landing.

## Cero tolerancia

- ❌ Saltar el TenantScope sin un `where('local_id', ...)` explícito.
- ❌ Devolver el modelo Eloquent en lugar de un Resource.
- ❌ Lógica de negocio en el controller (lleva al service).
- ❌ `dd()` o `var_dump()` committeados.
- ❌ Llave hardcodeada de API en el código (vienen de `.env`).
- ❌ Migraciones que no funcionen en sqlite (los tests las usan).
- ❌ Cambiar el formato del mensaje WhatsApp en PHP sin actualizar el TS (y viceversa).
