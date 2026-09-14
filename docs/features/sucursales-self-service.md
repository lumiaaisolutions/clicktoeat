# Self-service de alta de sucursales (Premium)

> Un owner **Premium** puede dar de alta sucursales nuevas **desde su panel**, sin
> pedirlo a soporte. Extiende la arquitectura de organizaciones de [ADR-014](../decisions/ADR-014-organizations-tenancy-consolidada.md)
> con una capa owner-facing de **escritura** (ADR-014 v1 era solo lectura).

## Qué hace

Desde el selector de sucursales (`LocalSwitcher`) → **"Agregar sucursal"** → wizard de
2 pasos (nombre + WhatsApp, luego slug/dirección opcionales). Crea un `Local` nuevo
que:

- **Cuelga de la organización** del owner (se crea la organización automáticamente si
  el local padre aún no tenía una).
- **Hereda el branding** del local padre (logo, banner, colores, tipografía, giro,
  tagline, métodos de pago).
- **Arranca con catálogo vacío** — el owner carga el menú de esa ubicación. (Copiar el
  catálogo se descartó en v1: es complejo y propenso a errores; mejor explícito.)
- Queda **cubierta por el plan de la organización** (`pago_externo = true`, mismo
  `plan_id` que el padre, `plan_status = 'active'`) → no cobra aparte.
- Se **enrola al owner** en ambos locales vía `user_locales`, así aparece en el switcher.

## Decisiones de negocio (defaults)

| Decisión | Valor v1 | Dónde cambiarlo |
|---|---|---|
| ¿Quién puede? | `owner` (no staff) con feature `sucursales_consolidadas` (Premium) | `StoreSucursalRequest::authorize` + middleware de ruta |
| Límite por plan | **Premium = 5** ubicaciones totales; essential/professional = 1 | columna `plans.max_sucursales` (seeder + migración) |
| Branding | Hereda del padre | `SucursalService::crear` |
| Catálogo | Vacío | `SucursalService::crear` |
| Billing | Incluida en el plan de la org (`pago_externo`) | `SucursalService::crear` |

> Estos son **defaults** elegidos por el equipo (el owner no fijó reglas explícitas).
> Ajustables sin refactor.

## Backend

| Pieza | Rol |
|---|---|
| `plans.max_sucursales` (migración `2026_09_14_000000`) | Límite por plan. null = ilimitado, 1 = sin sucursales. Premium=5. |
| `SucursalService` (`app/Services/Organizations/`) | Creación transaccional: asegura organización, crea local heredando branding, enrola al owner. Slug único (incluye soft-deleted). |
| `SucursalController` | `GET /me/sucursales` (lista + meta con límite/`puede_crear`), `POST /me/sucursales` (alta con chequeo de límite → `422 SUCURSAL_LIMIT_REACHED`). |
| `StoreSucursalRequest` | Valida rol (owner/super_admin) + input. Gate de plan por middleware. |
| Rutas | Dentro de `['auth:sanctum','tenant','plan.active']` + `feature:sucursales_consolidadas`. |
| `/auth/me` | Expone `plan.limits.sucursales`. |

**Multi-tenancy**: NO toca `TenantScope`. Cada sucursal sigue siendo un tenant
aislado (ADR-014). El único cruce es la lectura de la lista por `organization_id`,
con query explícita.

## Frontend

| Pieza | Rol |
|---|---|
| `components/admin/SucursalWizard.tsx` | Modal + `Wizard` de 2 pasos. Maneja errores 422 por campo y el límite. |
| `components/admin/LocalSwitcher.tsx` | Muestra "Agregar sucursal" a owners Premium (aparece **aunque tengan 1 local**, para poder crear la 2ª). Refresca la lista al crear. |
| `store/plan.ts` | `limits.sucursales` + gate con `has(Features.SUCURSALES_CONSOLIDADAS)`. |

## Tests

`tests/Feature/Organization/SucursalSelfServiceTest.php` (6, verde):
alta+herencia+creación de org, slug sin colisión, límite del plan, gate sin feature
(402), staff no puede (403), index con límite.

> **Fix colateral**: `PlanFactory::premium()` estaba como stub aliasando a
> `professional()` (comentario obsoleto "Premium fue retirado"). Se corrigió para
> representar Premium real (todas sus features + `max_sucursales=5`), alineándolo con
> `PlansSeeder`. Y `CampanaMail` (ahora `ShouldQueue`) → el test usa `assertQueued`.

## Pendiente / futuro

- Copiar catálogo del padre como plantilla opcional (hoy vacío).
- Reglas de branding independiente por sucursal (hoy hereda; se puede editar luego en Branding).
- **Paridad ClickToShop**: portar (tiendas en vez de restaurantes).
