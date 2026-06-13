# Feature — Permisos granulares de staff

> Cómo el owner controla qué módulos puede ver cada empleado dentro del panel.
> Esto es **independiente** del feature gating del SaaS (que limita por plan
> del local — ver [`feature-gating.md`](./feature-gating.md)).

## El modelo de dos capas

ClickToEat tiene dos sistemas de control de acceso que se aplican en orden:

1. **Plan del local** (SaaS feature gating, Fase 11): bloquea módulos enteros
   por el plan que pagó el local. Ejemplo: `pos` solo aparece en plan Premium.
   Esto se valida con `App\Support\Features::has($local, 'pos')`.
2. **Permisos del staff** (este doc, ya implementado): dentro de los módulos
   habilitados por el plan, el **owner** elige cuáles ve cada empleado.

Resultado:

```
Local con plan Profesional (incluye inventario, no incluye POS)
   │
   ├─ Owner Pedro → ve TODO lo del plan (Pedidos, Inventario, etc.). POS NO.
   │
   ├─ Staff Juan (rol cajero, permisos: pedidos)
   │     → ve solo "Pedidos". Inventario aunque está en el plan, Juan no.
   │     → POS no se ve igualmente porque el plan no lo incluye.
   │
   └─ Staff Lupe (rol manager, permisos: pedidos, productos, inventario, ...)
         → ve casi todo lo del plan. POS no (mismo motivo).
```

Owner **siempre tiene acceso a todo lo que el plan habilita**.
Super_admin tiene acceso a todo, plan y permisos incluidos.

## Esquema BD

Migración `2024_06_13_000000_add_permisos_to_users.php`:

```php
Schema::table('users', function (Blueprint $table) {
    $table->json('permisos')->nullable()->after('rol');
});
```

- `NULL` para staff = se aplica `User::PERMISOS_DEFAULT_STAFF = ['pedidos']`.
- Array para staff = los módulos listados (filtrados contra `MODULOS_VALIDOS`).
- Owner / super_admin ignoran esta columna y obtienen `MODULOS_VALIDOS` completo.

## Módulos válidos

Definidos en `App\Models\User::MODULOS_VALIDOS`:

| Key | Qué desbloquea |
|-----|-----------------|
| `pedidos` | `/admin/pedidos` — ver y atender pedidos entrantes |
| `pos` | `/admin/punto-venta` — cobrar pedidos en sucursal |
| `productos` | `/admin/productos` — CRUD del catálogo |
| `categorias` | `/admin/categorias` — organizar el menú |
| `inventario` | `/admin/inventario` + movimientos |
| `compras` | `/admin/compras` — registrar compras a proveedor |
| `recetas` | `/admin/recetas` — asociar ingredientes |
| `metricas` | `/admin/metricas` — ventas y reportes |
| `horarios` | `/admin/horarios` — editar horario de atención |
| `branding` | `/admin/branding` — personalizar landing |
| `qr` | `/admin/qr` — ver y descargar QR |
| `audit_log` | `/admin/audit-log` — historial de cambios |

`/admin` (inicio) y `/admin/perfil` son accesibles para todos los usuarios
autenticados sin importar permisos.
`/admin/staff` es solo para owner (no se da a staff vía permisos — un staff
no puede gestionar otros staff).

## Roles predefinidos (presets en el frontend)

El modal de "Nuevo empleado" tiene 4 botones de preset que pre-seleccionan los
checkboxes. El owner puede ajustar manualmente antes de guardar.

| Preset | Permisos incluidos |
|--------|---------------------|
| **Cajero** | `pedidos`, `pos` |
| **Encargado de cocina** | `pedidos`, `productos`, `recetas`, `inventario`, `compras` |
| **Manager** | `pedidos`, `pos`, `productos`, `categorias`, `inventario`, `compras`, `recetas`, `metricas`, `horarios`, `qr` |
| **Personalizado** | (vacío — el owner elige) |

Definidos en `apps/web/src/app/admin/staff/page.tsx` → constante `ROLES`.

Cuando el owner toggle un checkbox individual, el preset cambia
automáticamente a "Personalizado" (porque ya no coincide con un preset puro).

## API

### `GET /api/v1/local/staff`

Devuelve la lista de usuarios del local (owner + staff). Cada uno con su
`permisos` efectivo (owner = todos, staff = lo que tenga listado).

### `POST /api/v1/local/staff`

```json
{
  "nombre": "Juan Cajero",
  "email": "juan@taqueria.com",
  "password": "secreto123",
  "permisos": ["pedidos", "pos"]
}
```

- `permisos` es opcional. Si falta o es array vacío, se asigna `['pedidos']`.
- Cada elemento se filtra contra `User::MODULOS_VALIDOS` — strings inválidos
  se descartan silenciosamente.
- Solo el **owner** del local puede crear staff (controlado por `UserPolicy`).

### `PATCH /api/v1/local/staff/{id}`

```json
{
  "permisos": ["pedidos", "pos", "productos"]
}
```

Reemplaza la lista completa (no es diff). Si el owner cambia los permisos,
las sesiones activas del staff **NO** se cierran — los cambios aplican al
siguiente refresh del `/auth/me`. Si se cambia password, sí se cierran.

### `GET /api/v1/auth/me`

Ahora incluye `permisos` en el payload del usuario:

```json
{
  "user": {
    "id": 5,
    "rol": "staff",
    "permisos": ["pedidos", "pos"],
    ...
  }
}
```

El frontend usa esto para construir el sidebar.

## Backend — helpers en `User`

```php
public function puedeAcceder(string $modulo): bool;
public function permisosEfectivos(): array;
```

Uso típico en controller / middleware:

```php
if (! $user->puedeAcceder('inventario')) {
    abort(403, 'No tienes permisos para inventario.');
}
```

**TODO** (no implementado todavía): middleware `EnsurePermiso` para aplicar
a routes específicas. Hoy depende de Policies + revisión manual en
controllers críticos. Antes de Fase 11 (SaaS) hay que cerrar este gap.

## Frontend — filtrado del sidebar

En `apps/web/src/app/admin/layout.tsx`, cada `NavItem` declara su `permiso`:

```ts
const NAV_OWNER: NavItem[] = [
  { href: '/admin/pedidos',    label: 'Pedidos',   icon: 'bell',  permiso: 'pedidos' },
  { href: '/admin/inventario', label: 'Inventario', icon: 'box',   permiso: 'inventario' },
  { href: '/admin/staff',      label: 'Equipo',    icon: 'list',  ownerOnly: true },
];
```

El `useMemo` filtra:
- Owner ve todos los items (excepto `ownerOnly` que también ve).
- Staff ve solo los items cuyo `permiso` esté en `user.permisos`.
- Items sin `permiso` declarado (ej. "Inicio") son visibles para todos.

## UX del modal

`StaffFormModal` en `apps/web/src/app/admin/staff/page.tsx`:

```
┌──────────────────────────────────────────┐
│ Nuevo empleado                       [×]│
├──────────────────────────────────────────┤
│  [Nombre]              [Email]           │
│  [Contraseña]          [Confirmar]       │
│                                          │
│  Rol predefinido                         │
│  ┌────────────┐ ┌────────────────────┐  │
│  │ Cajero   ✓ │ │ Encargado de cocina│  │
│  └────────────┘ └────────────────────┘  │
│  ┌────────────┐ ┌────────────────────┐  │
│  │ Manager    │ │ Personalizado      │  │
│  └────────────┘ └────────────────────┘  │
│                                          │
│  Acceso a módulos        2 de 12 sel.   │
│  ☑ Pedidos                              │
│  ☑ Punto de venta                       │
│  ☐ Productos                            │
│  ☐ Categorías                           │
│  ... (12 total)                          │
│                                          │
│  [Crear empleado]        [Cancelar]      │
└──────────────────────────────────────────┘
```

## Tests pendientes

- `StaffPermisosTest::staff_solo_ve_modulos_con_permiso`
- `StaffPermisosTest::owner_ignora_permisos_y_ve_todo`
- `StaffPermisosTest::permisos_invalidos_se_descartan_silenciosamente`
- `StaffPermisosTest::array_vacio_persiste_como_default_pedidos`

## Cuando arranque Fase 11 SaaS

El módulo de plan agregará una capa extra encima:

```php
// Pseudocódigo del middleware combinado
if (! Features::has($local, $modulo)) {
    // Plan no lo incluye — 402 Payment Required
    return paymentRequired();
}
if (! $user->puedeAcceder($modulo)) {
    // Plan sí lo tiene, pero el owner no le dio permiso al staff — 403 Forbidden
    return forbidden();
}
```

El frontend debe distinguir las dos para mostrar el mensaje correcto:
- "Esta función requiere tu plan superior" (upgrade)
- "Tu owner no te dio acceso a este módulo" (pedirle al jefe)

## Ver también

- [`feature-gating.md`](./feature-gating.md) — Capa SaaS por plan (próxima fase)
- [`saas-billing.md`](./saas-billing.md) — Arquitectura del módulo de billing
- [`/admin/staff/page.tsx`](../../apps/web/src/app/admin/staff/page.tsx) — UI
- [`StaffController.php`](../../apps/api/app/Http/Controllers/Api/StaffController.php) — API
