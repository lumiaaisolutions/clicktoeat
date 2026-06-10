# Arquitectura — Overview

ClickToEat es un **SaaS multi-tenant** para locales de comida. Cada local tiene su **propia landing pública** (`tudominio.com/{slug}`) con menú, y un botón que abre WhatsApp con el pedido pre-armado. Sin app del cliente, sin comisiones.

## Roles del sistema

| Rol           | Qué hace                                                          |
|---------------|-------------------------------------------------------------------|
| `super_admin` | Alta/baja/suspensión de locales. Resetea contraseñas. Bypassea tenant. |
| `owner`       | Dueño de UN local: branding, productos, recetas, pedidos, métricas. |
| `staff`       | Personal de un local: ve y atiende pedidos, ajusta stock.          |
| **(anónimo)** | Cliente final que pide desde la landing pública del local.         |

## Las 3 caras del producto

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  Cliente (anónimo)   │   │  Owner / staff       │   │  Super admin          │
│  /{slug}             │   │  /admin/*            │   │  /admin/locales/*     │
│  Lee menú, manda     │   │  Crea productos,     │   │  Da de alta locales,  │
│  pedido vía WhatsApp │   │  ve pedidos,         │   │  suspende, resetea    │
│  + opcional API      │   │  ajusta inventario   │   │  contraseñas          │
└──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
           │                          │                          │
           ▼                          ▼                          ▼
        ┌────────────────────────────────────────────────────────────┐
        │              API Laravel 11 (Sanctum bearer tokens)         │
        │  ─ middleware `tenant` filtra por local_id automáticamente │
        │  ─ middleware `super_admin` bloquea endpoints globales     │
        │  ─ TenantContext (singleton) + GlobalScope en cada modelo  │
        └─────────────────────────┬──────────────────────────────────┘
                                  ▼
                            MySQL 8 (única BD)
                            Tablas con `local_id`
```

## Stack en una línea

**Backend:** Laravel 11 + PHP 8.3 + Sanctum (bearer) + MySQL 8 + L5-Swagger.
**Frontend:** Next.js 14 App Router + TypeScript estricto + Tailwind + Zustand + Axios.
**Infra:** Docker Compose (nginx + php-fpm + mysql 8 + node 20).

Detalle en [`stack.md`](stack.md).

## Decisiones clave

- **Una sola BD MySQL** con scope por `local_id` (no schema-per-tenant) → simplifica operaciones, escalable hasta miles de locales sin ceremonia.
- **Bearer tokens Sanctum**, no cookies SPA-stateful → Next.js corre en otro origen, evita el ciclo CSRF.
- **Snapshot de precio/nombre** en `detalle_pedidos` → el histórico no se rompe cuando el owner cambia precios.
- **Inventario con `FOR UPDATE`** + `DB::transaction` → un pedido concurrente no puede comprar el último item ya vendido por otro.
- **Estado del local (abierto/cerrado) calculado server-side** y enviado en la respuesta → evita hydration mismatch en Next.js.
- **Espejo PHP ↔ TS del formato WhatsApp** → la preview en el carrito es idéntica al backend de fallback.

Ver también: [`multi-tenancy.md`](multi-tenancy.md), [`auth-roles.md`](auth-roles.md).
