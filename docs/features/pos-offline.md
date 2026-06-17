# POS offline — funciona sin internet

Cuando se cae el internet en el local, el POS sigue cobrando localmente
y sincroniza cuando vuelva la conexión.

## Por qué

- Locales en zonas con mal internet (rural, suburbios CDMX, plazas saturadas).
- Internet cae justo en hora pico → si el POS no funciona, el local
  pierde ventas durante 30 minutos.
- Mesero no debería tener que esperar a que vuelva internet para cobrar.

## Cómo funciona (arquitectura)

```
                       NORMAL OPERATION
Cliente paga → POS frontend → POST /pedidos → Backend → DB
                                  │
                                  └─── Service Worker intercepta
                                       y cachea en IndexedDB

                       SIN INTERNET
Cliente paga → POS frontend → POST /pedidos → Service Worker:
                                              │
                                              ├─ Guardar en IndexedDB
                                              │  como "pendiente"
                                              ├─ Devolver 202 Accepted
                                              │  con id local
                                              └─ Mostrar UI normal:
                                                 "Pedido aceptado"

                       VUELVE INTERNET
Service Worker detecta navigator.onLine = true
   │
   └─── Itera pendientes en IndexedDB:
        POST /pedidos con flag X-Sync-Mode: replay
        Backend deduplica por idempotency-key del SW
        Marcar como sincronizado
```

## Garantías

- **Cero pedidos duplicados**: cada POST offline genera un
  `Idempotency-Key: pos-{deviceId}-{timestamp}`. El backend (que ya tiene
  middleware `idempotent:24h`) lo reconoce y no duplica.
- **Cero pedidos perdidos**: IndexedDB persiste aunque cierres el browser.
- **Cero cobros dobles**: el POS pide al usuario confirmar UNA SOLA VEZ.
  Si después le da "siguiente pedido" y vuelve atrás, el pedido anterior
  ya está en cola y el botón "Cobrar" está deshabilitado.

## Implementación (tareas)

### Backend (mínimas)
- ✅ `Idempotency-Key` middleware ya existe (`idempotent:24h` en
  `/public/pedidos/{slug}` y se reusará para POS interno).
- Pendiente: agregar middleware `idempotent` también a `POST /pedidos`
  (POS interno).

### Frontend
1. **Service Worker**: ya existe `public/sw.js` (PWA). Agregar handler
   en el evento `fetch`:
   - Si la request es a `/api/v1/pedidos` (POST) y `navigator.onLine = false`
   - Guardar en IndexedDB store `pending-orders`
   - Devolver respuesta sintética `{status: 'pending', local_id: uuid}`
2. **Cliente POS** (`/admin/punto-venta`):
   - Detectar offline → banner amarillo "Modo offline: tus pedidos se
     enviarán cuando vuelva el internet"
   - Botón cobrar funciona igual; usa la respuesta sintética del SW
3. **Background sync** del SW:
   - Listener `window.addEventListener('online', syncPendingOrders)`
   - O `registration.sync.register('pending-orders')` para sync nativo
4. **UI de pendientes**:
   - En `/admin/pedidos` mostrar tab "Sincronizando" con count
   - Cuando todos suben, banner verde "Todo al día"

## Status

📅 **Pendiente de implementar UI**. El backend (idempotency) ya soporta
el flow. Falta el service worker handler + IndexedDB store + UI POS.

## Pendiente para próxima iteración

Estimado: 3-4 días dev frontend, 1 día dev backend (agregar middleware
idempotent al POS interno y validar replay).
