# Frontend — Panel de admin

`apps/web/src/app/admin/`.

## Acceso

Requiere login (`POST /auth/login` → token guardado en `clickeat:token`). El layout valida en mount y redirige a `/login` si falta.

## Layout

`app/admin/layout.tsx`:
- Sidebar con navegación.
- Header con avatar del user + NotificacionesBell.
- Filtra elementos del menú según `rol`:
  - `owner` / `staff`: ve catálogo, ventas, inventario, métricas, branding, horarios, perfil.
  - `super_admin`: adicionalmente `/admin/locales`.

## Páginas

### `/admin` (home)
Dashboard con KPIs rápidos del día (lecturas de `/metricas?preset=hoy`).

### `/admin/branding`
Editor del branding del local. Side-by-side: form ↔ preview en vivo.

Endpoints: `GET /local`, `PATCH /local`. Upload de logo/banner con `<ImageUpload>`.

### `/admin/categorias`
CRUD inline de categorías. Reordenar (drag opcional), activar/desactivar, eliminar (bloquea si tiene productos).

### `/admin/productos`
Lista paginada + búsqueda. Modal de crear/editar con `<ImageUpload>` para imagen y editor de `extras`. Marca disponibilidad rápida con switch.

### `/admin/inventario`
Lista de ingredientes con badge bajo_stock. Filtros, búsqueda. Modal de ajuste manual (`POST /ingredientes/{id}/ajuste`). Subroute `/admin/inventario/[id]` muestra el historial de movimientos.

### `/admin/compras`
Lista de compras. Modal "Nueva compra": picker de ingredientes + filas con cantidad/costo + impuestos + notas → `POST /compras`. Anular desde el detalle (`DELETE /compras/{id}` con confirmación).

### `/admin/pedidos`
Lista de pedidos con filtros por estado. Acción rápida: pasar al siguiente estado. Detalle con todos los items + dirección + total.

### `/admin/punto-venta`
POS interno: selector visual de productos por categoría → carrito local → checkout → `POST /pedidos`.

### `/admin/metricas`
Selector de rango (preset / fechas) + tarjetas de KPI + gráficas (serie diaria, top productos, distribuciones).

### `/admin/horarios`
Tabla por día de la semana con `open`/`close`. Toggle `cerrado_temporal`. Selector de zona horaria. → `PATCH /local/horarios`.

### `/admin/qr`
Generador de QR del menú (`https://<APP_URL>/<slug>`). Descarga como PNG.

### `/admin/perfil`
Cambiar nombre/email del usuario. Cambiar contraseña (`PATCH /auth/me/password`).

### `/admin/locales` (super_admin)
Lista de todos los locales. Filtros. Crear nuevo (`POST /admin/locales`). Suspender/reactivar.

### `/admin/locales/[id]` (super_admin)
Detalle del local + lista de usuarios + reset de password del owner.

## Patrón de fetch

Cada page hace su propia llamada con `useEffect` + `api.get(...)`. Sin React Query / SWR todavía → cada page maneja loading/error a mano. Pendiente migrar.

```tsx
'use client';
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.get('/productos')
    .then(({ data }) => setData(data))
    .catch(err => toast.error(err?.response?.data?.message ?? 'Error'))
    .finally(() => setLoading(false));
}, []);
```

## Mutaciones

Patrón optimista no implementado. Cada mutación:
1. Manda request.
2. Espera respuesta.
3. Re-fetch o actualiza el state local.
4. Toast de confirmación.

## Errors UX

- 401 → interceptor de axios limpia token + redirige a `/login` (manual desde catch).
- 403 → toast con `message`.
- 409 → toast + mostrar lista de `faltantes` cuando aplica.
- 422 → toast del primer error + resaltar campos.

## Estado compartido

- `useAuth` (user actual).
- `useNotificaciones` (en `NotificacionesBell`).
- `useToast` (global).
- `useCart` se reusa en `/admin/punto-venta` (mismo carrito que el público — limpia al cerrar sesión).

## Pendientes

- React Query / SWR para cachear + revalidate.
- Confirmación con modal en lugar de `confirm()` nativo.
- Permisos visuales: ocultar acciones que el rol no permite (hoy se confía en el 403 del backend).
- Audit log para que el owner vea cambios hechos por staff.
- Dark mode real.
- Test cobertura cero hoy — agregar Playwright o similar.
