# Feature — Gating por plan de suscripción

> Cómo se bloquean/desbloquean los módulos del sistema según el plan del
> local. Arquitectura del módulo de cobro: [`saas-billing.md`](./saas-billing.md).
> Decisión arquitectónica: [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md).

## Catálogo de feature keys

Una **feature key** es un string identificador de una capacidad del sistema.
Se definen en `App\Support\Features` como constantes y se persisten en
`plans.features` (JSON array).

### Acceso a módulos

> **Actualizado Fase 19 (2026-06-15)**: el plan Premium fue retirado.
> El sistema ahora tiene 2 planes (essential, professional). POS, audit_log,
> metricas_avanzadas y restore se movieron a Professional. POS adicionalmente
> está disponible desde Essential.

| Key | Módulo / endpoint | Esencial $99 | Profesional $299 |
|-----|-------------------|:-:|:-:|
| `branding_basico` | Logo + 1 color primario | ✅ | ✅ |
| `branding_avanzado` | Banner + 3 colores + tipografía + redes | ✅ | ✅ |
| `qr_personalizado` | QR con logo + colores del local descargable | ✅ | ✅ |
| `pos` | `/admin/punto-venta` (caja en sucursal) | ✅ | ✅ |
| `notificaciones` | Bell de notificaciones in-app | ✅ | ✅ |
| `inventario` | `/admin/inventario`, ingredientes, movimientos | — | ✅ |
| `recetas` | Asociación producto → ingrediente | — | ✅ |
| `compras` | `/admin/compras`, promedio ponderado | — | ✅ |
| `metricas_basicas` | `/admin/metricas` ventas día/semana/top | — | ✅ |
| `metricas_avanzadas` | Margen, comparativas, forecast | — | ✅ |
| `staff_multi` | `/admin/staff` CRUD (hasta `max_staff`) | — | ✅ (∞) |
| `audit_log` | `/admin/audit-log` con diff de cambios | — | ✅ |
| `restore` | Botón restore en soft-deleted | — | ✅ |

### Límites cuantitativos

Columnas en `plans`:

| Columna | Esencial | Profesional |
|---------|:-:|:-:|
| `max_productos` | 30 | NULL (∞) |
| `max_categorias` | 8 | NULL |
| `max_staff` | 0 | NULL (∞) |

`NULL` = ilimitado.

## Implementación backend

### `App\Support\Features`

```php
namespace App\Support;

use App\Models\Local;

final class Features
{
    public const BRANDING_BASICO    = 'branding_basico';
    public const BRANDING_AVANZADO  = 'branding_avanzado';
    public const INVENTARIO         = 'inventario';
    public const RECETAS            = 'recetas';
    public const COMPRAS            = 'compras';
    public const METRICAS_BASICAS   = 'metricas_basicas';
    public const METRICAS_AVANZADAS = 'metricas_avanzadas';
    public const POS                = 'pos';
    public const QR_PERSONALIZADO   = 'qr_personalizado';
    public const NOTIFICACIONES     = 'notificaciones';
    public const STAFF_MULTI        = 'staff_multi';
    public const AUDIT_LOG          = 'audit_log';
    public const RESTORE            = 'restore';

    /** @return list<string> */
    public static function all(): array
    {
        return (new \ReflectionClass(self::class))->getConstants();
    }

    public static function has(Local $local, string $feature): bool
    {
        if (! $local->hasActivePlan()) return false;
        return in_array($feature, $local->plan->features ?? [], true);
    }
}
```

### Middleware `RequiresFeature`

Protege rutas completas:

```php
namespace App\Http\Middleware;

use App\Support\Features;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiresFeature
{
    public function handle(Request $req, Closure $next, string $feature): Response
    {
        $local = app(TenantContext::class)->local();

        if (! Features::has($local, $feature)) {
            return response()->json([
                'message' => 'Esta función requiere actualizar tu plan.',
                'code' => 'FEATURE_LOCKED',
                'required_feature' => $feature,
                'current_plan' => $local->plan?->slug,
                'upgrade_url' => '/admin/billing',
            ], 402);
        }

        return $next($req);
    }
}
```

Registro en `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $m) {
    $m->alias([
        'feature' => \App\Http\Middleware\RequiresFeature::class,
    ]);
})
```

Aplicación en `routes/api.php`:

```php
Route::middleware(['auth:sanctum', 'feature:inventario'])->group(function () {
    Route::apiResource('ingredientes', IngredienteController::class);
    Route::apiResource('recetas', RecetaController::class);
    Route::get('inventario/movimientos', [MovimientoController::class, 'index']);
});

Route::middleware(['auth:sanctum', 'feature:pos'])->group(function () {
    Route::post('pos/cobrar', [PosController::class, 'cobrar']);
});

Route::middleware(['auth:sanctum', 'feature:metricas_basicas'])->group(function () {
    Route::get('metricas/dia', [MetricasController::class, 'dia']);
});

Route::middleware(['auth:sanctum', 'feature:audit_log'])->group(function () {
    Route::get('audit-logs', [AuditLogController::class, 'index']);
});
```

### Policies — límites cuantitativos

`max_productos`, `max_categorias`, `max_staff` se enforcan en las Policies:

```php
// app/Policies/ProductoPolicy.php
public function create(User $user): bool
{
    if (! $this->ownsOrWorksAt($user, app(TenantContext::class)->localId())) {
        return false;
    }

    $local = $user->local;
    $max = $local->plan?->max_productos;

    if ($max === null) return true;  // ilimitado
    return $local->productos()->count() < $max;
}
```

Cuando la Policy retorna false con `denyAsNotFound()` o sin `denyWithStatus(402)`,
Laravel devuelve 403 default. Para distinguir "no autorizado" de "límite del plan
alcanzado", el controller lanza un `PlanLimitException`:

```php
// app/Http/Controllers/Api/ProductoController.php
public function store(StoreProductoRequest $req): JsonResponse
{
    $local = app(TenantContext::class)->local();
    $max = $local->plan?->max_productos;

    if ($max !== null && $local->productos()->count() >= $max) {
        throw new PlanLimitException(
            feature: 'productos',
            limit: $max,
            current: $local->productos()->count(),
        );
    }

    // ... continuar con create
}
```

`PlanLimitException` mapeada en `bootstrap/app.php` → JSON 402:

```php
->withExceptions(function (Exceptions $ex) {
    $ex->render(function (PlanLimitException $e) {
        return response()->json([
            'message' => "Alcanzaste el límite de tu plan ({$e->limit} {$e->feature}).",
            'code' => 'PLAN_LIMIT',
            'feature' => $e->feature,
            'limit' => $e->limit,
            'current' => $e->current,
            'upgrade_url' => '/admin/billing',
        ], 402);
    });
})
```

### Exponer plan + features en `/auth/me`

```php
// AuthController::me
return [
    'user' => new UserResource($user),
    'local' => new LocalResource($user->local),
    'plan' => $user->local?->plan ? [
        'slug' => $user->local->plan->slug,
        'nombre' => $user->local->plan->nombre,
        'features' => $user->local->plan->features,
        'limits' => [
            'productos' => $user->local->plan->max_productos,
            'categorias' => $user->local->plan->max_categorias,
            'staff' => $user->local->plan->max_staff,
        ],
        'status' => $user->local->plan_status,
        'current_period_ends_at' => $user->local->current_period_ends_at,
        'trial_ends_at' => $user->local->trial_ends_at,
    ] : null,
];
```

## Implementación frontend

### Store `usePlan`

```ts
// store/plan.ts
import { create } from 'zustand';

export interface PlanInfo {
  slug: 'essential' | 'professional' | 'premium';
  nombre: string;
  features: string[];
  limits: { productos: number | null; categorias: number | null; staff: number | null };
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_ends_at: string;
  trial_ends_at: string | null;
}

interface PlanState {
  plan: PlanInfo | null;
  setPlan(p: PlanInfo | null): void;
  has(feature: string): boolean;
  isTrialing(): boolean;
  daysUntilTrialEnd(): number | null;
}

export const usePlan = create<PlanState>((set, get) => ({
  plan: null,
  setPlan: (p) => set({ plan: p }),

  has: (feature) => {
    const p = get().plan;
    if (!p) return false;
    if (!['trialing', 'active'].includes(p.status)) return false;
    return p.features.includes(feature);
  },

  isTrialing: () => get().plan?.status === 'trialing',

  daysUntilTrialEnd: () => {
    const t = get().plan?.trial_ends_at;
    if (!t) return null;
    const ms = new Date(t).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  },
}));
```

### Componente `<LockedFeature>`

Wrapper que decide entre mostrar el contenido real o el overlay bloqueado:

```tsx
// components/billing/LockedFeature.tsx
'use client';

import { usePlan } from '@/store/plan';
import { UpgradeCard } from './UpgradeCard';

interface Props {
  feature: string;
  children: React.ReactNode;
  /** Título mostrado en el overlay si está bloqueado */
  title: string;
  /** Plan mínimo requerido — informativo */
  requiredPlan: 'professional' | 'premium';
}

export function LockedFeature({ feature, children, title, requiredPlan }: Props) {
  const hasFeature = usePlan(s => s.has(feature));

  if (hasFeature) return <>{children}</>;

  return (
    <div className="relative min-h-[400px]">
      {/* Contenido bluereado para crear deseo */}
      <div className="filter blur-sm pointer-events-none select-none opacity-60">
        {children}
      </div>
      {/* Overlay con CTA */}
      <div className="absolute inset-0 grid place-items-center bg-white/40 backdrop-blur">
        <UpgradeCard title={title} requiredPlan={requiredPlan} />
      </div>
    </div>
  );
}
```

### Componente `<UpgradeCard>`

```tsx
// components/billing/UpgradeCard.tsx
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export function UpgradeCard({ title, requiredPlan }: { title: string; requiredPlan: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white shadow-soft p-8 max-w-sm text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 grid place-items-center mx-auto">
        <Icon name="sparkles" size={20} className="text-amber-700" />
      </div>
      <h3 className="ce-display text-2xl font-bold mt-4">{title}</h3>
      <p className="text-sm text-muted mt-2">
        Esta función está disponible en el plan <strong>{requiredPlan}</strong>.
      </p>
      <Link
        href="/admin/billing"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-ink text-white text-sm font-medium"
      >
        Subir de plan
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}
```

### Sidebar con candado

```tsx
// app/admin/layout.tsx — sidebar item
const items = [
  { href: '/admin/productos',    label: 'Productos',    icon: 'utensils' },
  { href: '/admin/inventario',   label: 'Inventario',   icon: 'truck',     feature: 'inventario' },
  { href: '/admin/punto-venta',  label: 'POS',          icon: 'storefront', feature: 'pos' },
];

{items.map((item) => {
  const locked = item.feature && !usePlan(s => s.has(item.feature));
  return (
    <Link
      href={item.href}
      className={cn('flex items-center gap-2', locked && 'opacity-60')}
    >
      <Icon name={item.icon} size={16} />
      {item.label}
      {locked && <Icon name="shield" size={12} className="ml-auto text-muted" />}
    </Link>
  );
})}
```

Los módulos bloqueados **se muestran** (no se ocultan). El sidebar es el principal vector de upsell.

### Banner de trial

Cuando `plan_status === 'trialing'`, mostrar arriba del admin un banner:

```tsx
{plan?.isTrialing() && (
  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm">
    Tu trial termina en <strong>{plan.daysUntilTrialEnd()} días</strong>.
    <Link href="/admin/billing" className="ml-2 underline">Agregar tarjeta</Link>
  </div>
)}
```

## Página `/admin/billing`

Estructura:

- Card grande con plan actual + status badge + `current_period_ends_at`.
- Si `trialing`: countdown a `trial_ends_at` + CTA "Agregar tarjeta".
- Si `past_due`: banner rojo + CTA "Actualizar método de pago".
- Botón "Cambiar plan" → `GET /billing/portal` → `window.location = url`.
- Botón "Cancelar" → mismo portal de Stripe.
- Link "Ver facturas" → mismo portal.

## Tests

### Backend

```php
// tests/Feature/FeatureGatingTest.php
public function test_essential_no_accede_a_inventario(): void
{
    $local = Local::factory()->withPlan('essential')->create();
    $owner = User::factory()->owner($local)->create();
    Sanctum::actingAs($owner);

    $this->getJson('/api/v1/ingredientes')->assertStatus(402)
        ->assertJsonPath('code', 'FEATURE_LOCKED');
}

public function test_essential_alcanza_limite_de_productos(): void
{
    $local = Local::factory()->withPlan('essential')->create();  // max=30
    Producto::factory()->count(30)->paraLocal($local)->create();

    $owner = User::factory()->owner($local)->create();
    Sanctum::actingAs($owner);

    $this->postJson('/api/v1/productos', [...])->assertStatus(402)
        ->assertJsonPath('code', 'PLAN_LIMIT')
        ->assertJsonPath('limit', 30);
}

public function test_premium_accede_a_todo(): void
{
    $local = Local::factory()->withPlan('premium')->create();
    $owner = User::factory()->owner($local)->create();
    Sanctum::actingAs($owner);

    $this->getJson('/api/v1/audit-logs')->assertOk();
    $this->getJson('/api/v1/ingredientes')->assertOk();
    $this->getJson('/api/v1/metricas/margenes')->assertOk();
}
```

### Frontend

Unit tests del store `usePlan.has(...)` y del `<LockedFeature>` con react-testing-library.

## Errores que devuelve la API

| Status | Code | Cuándo |
|--------|------|--------|
| 402 | `FEATURE_LOCKED` | Endpoint protegido + plan no incluye |
| 402 | `PLAN_LIMIT` | Cantidad de productos/staff alcanzó `max_*` |
| 402 | `PLAN_INACTIVE` | `plan_status` ∈ {past_due cumplió gracia, incomplete} |

Todos con `upgrade_url` para que el frontend redirija.

## Ver también

- [`saas-billing.md`](./saas-billing.md) — Arquitectura del módulo de cobro
- [`ADR-011`](../decisions/ADR-011-saas-pricing-and-feature-gating.md) — Decisión
- [`runbook/configurar-stripe.md`](../runbook/configurar-stripe.md) — Setup Stripe
