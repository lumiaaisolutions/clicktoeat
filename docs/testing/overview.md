# Testing — Estrategia

## Estado actual

| Capa            | Cobertura                                              |
|----------------|--------------------------------------------------------|
| Backend (PHPUnit Feature) | **7 suites** con ~65 tests cubriendo flujos clave |
| Backend (Unit)  | No hay                                                  |
| Frontend (unit / integration)  | **No hay**                                |
| E2E (Playwright / Cypress)     | **No hay**                                |
| Linting         | `pint` (PHP) y `eslint` (TS) configurados, no automatizados en CI |
| Type checking   | `tsc --noEmit` configurado, no automatizado              |

## Lo que sí existe

Tests Feature en `apps/api/tests/Feature/`:

| Suite                          | Qué cubre                                                          |
|-------------------------------|--------------------------------------------------------------------|
| `PedidoFlowTest`                | Pedido público end-to-end: menú, creación, stock, WhatsApp URL, scope multi-tenant, máquina de estados básica |
| `PuntoVentaTest`                | POS interno: auto-confirmación de sucursal, `tarjeta_tpv`, sin stock |
| `RecetaTest`                    | Sync de recetas, idempotencia, validación XOR, autorización         |
| `InventarioAvanzadoTest`         | Reintegro al cancelar, idempotencia, historial, notificaciones de bajo_stock, productos compuestos, detección de ciclos |
| `ComprasTest`                   | Registrar, promedio ponderado, anular, no anular si ya se consumió, listado, permisos staff/owner |
| `HorariosYMetricasTest`         | Estado calculado, cerrado_temporal, horarios cruzando, KPIs y series, bloqueo de pedidos por horario, POS sí acepta fuera de horario |
| `SuperAdminLocalesTest`         | Crear con owner, suspender/reactivar, scope global, slug duplicado, borrar soft |

Listado completo de tests por suite en [`testing/suites.md`](suites.md).

## Cómo correr

```bash
# Docker
docker compose exec api vendor/bin/phpunit

# Nativo
cd apps/api && vendor/bin/phpunit

# Filtrar a una suite
vendor/bin/phpunit --filter=PedidoFlowTest

# Filtrar a un test específico
vendor/bin/phpunit --filter=cancelar_pedido_reintegra_el_stock_descontado
```

## Configuración

`apps/api/phpunit.xml`:
- Bootstrap: `vendor/autoload.php`.
- Suite única: `Feature` (`tests/Feature`).
- Env de tests:
  - `APP_ENV=testing`
  - `DB_CONNECTION=sqlite` + `DB_DATABASE=:memory:` → cada test arranca con esquema limpio.
  - `BCRYPT_ROUNDS=4` (rápido).
  - `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `SESSION_DRIVER=array`, `MAIL_MAILER=array`.

## Patrones

- **`RefreshDatabase`** en cada test class — recrea tablas in-memory.
- **Sin factories formales** (`database/factories/` no existe). Los tests construyen datos a mano con `Model::create([...])`. Pendiente: agregar factories — facilita tests futuros.
- **Helpers en `TestCase`**: no hay (es la base de Laravel default). Cada suite tiene su `setUp()` que crea local + owner + categoría + producto + ingrediente típicos.
- **Sanctum**: `Sanctum::actingAs($user, ['*'])` — pasa las abilities en bypass.

## Por qué sqlite

- **Velocidad**: in-memory; cada test corre en ms.
- **Hermético**: cada test es independiente.
- **Cross-driver guards**: las migraciones detectan sqlite y skip operaciones MySQL-specific (`ALTER ENUM`, `lockForUpdate`).

Limitación: tests no validan comportamientos MySQL-only (FOR UPDATE, JSON path queries específicos). Hoy es aceptable; el código de prod hace fallback razonable.

## Lo que falta para llegar a un proyecto saludable

- **Factories** para todos los modelos.
- **Test de FormRequest** dedicados (`Tests\Unit`).
- **Test de Policies** dedicados.
- **Test del builder TS `buildWhatsAppUrl`** (Vitest / Jest en `apps/web`).
- **E2E** del flujo público con Playwright.
- **Pipeline CI** (`.github/workflows/ci.yml`) que corra phpunit + pint + tsc + eslint en cada push.
- **Coverage report** (`phpunit --coverage-html`) para descubrir zonas no probadas.
- **Tests de carga** (k6, JMeter) — el endpoint público es el más expuesto.

Ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).
