# API — Endpoints públicos

Sin autenticación. Throttle global `60/min` + extra cuando aplica.

## GET `/public/locales`

Directorio de locales activos para la home pública. Usa `MenuResource` (camelCase).

**200**
```json
{
  "data": [
    {
      "id": 1, "slug": "tacos-el-gordo",
      "nombre": "Tacos El Gordo",
      "tagline": "...", "logo": "...", "banner": "...",
      "colorPrimario": "#FF2D2D", "colorSecundario": "#0B0B0F",
      "direccion": "...",
      "whatsapp": "5215512345678",
      "horarios": [{"dia":"lun","open":"12:00","close":"23:00"}],
      "estado": {
        "abierto": true,
        "mensaje": "Abierto · cierra a las 23:00",
        "proxima_apertura": null,
        "proximo_cierre": "23:00"
      },
      "deliveryFee": 35,
      "deliveryMinutos": 30,
      "deliveryRadioKm": 5,
      "lat": 19.4326, "lng": -99.1332,
      "redesSociales": {"ig":"...","fb":"..."},
      "productosCount": 24
    }
  ]
}
```

Solo locales con `activo=true AND suspendido=false`. `cerrado_temporal` se refleja en `estado.mensaje` pero el local **sí aparece** en el directorio.

---

## GET `/public/menu/{slug}` (y alias `/menu/{slug}`)

Datos completos del local para construir la landing.

**200** (formato resumido; ver `MenuController::show`):
```json
{
  "data": {
    "local": {
      "id": 1, "nombre": "Tacos El Gordo", "slug": "tacos-el-gordo",
      "tagline": "...", "whatsapp": "...", "telefono": "...",
      "direccion": "...", "lat": ..., "lng": ...,
      "horarios": [...], "estado": {...},
      "redes": {...},
      "metodosPago": ["efectivo","tarjeta_entrega","transferencia"],
      "delivery": {"fee":35,"minMinutos":30,"radioKm":5,"zona":null}
    },
    "branding": {
      "logo":..., "banner":...,
      "colorPrimario":..., "colorSecundario":..., "colorFondo":...,
      "tipografia":"...", "darkMode": false
    },
    "categorias": [
      {"id":1,"slug":"tacos","nombre":"Tacos","icono":"fa-utensils","orden":1}
    ],
    "productos": [
      {
        "id": 10, "slug": "taco-al-pastor", "nombre": "Taco al Pastor",
        "descripcion":"...", "precio": 28, "precioDescuento": null,
        "imagen":"...", "disponible": true, "esCombo": false,
        "esPromocion": false, "tag": "Más pedido",
        "extras": [
          {"group":"Tortilla","kind":"one","required":true,
           "items":[{"id":"maiz","name":"Maíz","price":0}]}
        ],
        "categoria": {"id":1,"slug":"tacos"}
      }
    ]
  }
}
```

Sólo trae:
- `categorias` con `activo=true` (ordenadas por `orden`)
- `productos` con `disponible=true` (ordenados por `orden`)

**404** si el slug no existe o el local no está activo.

---

## POST `/public/pedidos/{slug}`

Crea un pedido sin autenticación. **Throttle adicional `20/min`**.

### Request
```json
{
  "cliente": {
    "nombre": "María Pérez",
    "telefono": "5215512345678",
    "direccion": "Av. Insurgentes 432",
    "lat": 19.43, "lng": -99.13,
    "notas": "tocar timbre 2"
  },
  "metodo_entrega": "pickup | delivery",
  "metodo_pago": "efectivo | tarjeta_entrega | transferencia",
  "items": [
    {
      "producto_id": 10,
      "cantidad": 2,
      "notas": "sin cebolla",
      "extras": [
        {"group":"Tortilla","item":"Harina","price":5},
        {"group":"Salsas","item":"Habanero","price":0}
      ]
    }
  ]
}
```

Validación: `StorePublicPedidoRequest`. Detalles en [`api/form-requests.md`](form-requests.md).

### Respuestas

| Código | Cuando                                                  |
|-------|---------------------------------------------------------|
| 201   | OK — `data: PedidoResource`, top-level `whatsapp_url`    |
| 404   | Slug no existe / local inactivo                          |
| 409   | Local cerrado (`estado.abierto=false`) o stock insuficiente |
| 422   | Validación (incluye fuera de radio de entrega)           |

**409 stock insuficiente:**
```json
{
  "message": "Stock insuficiente: Tortilla (necesario 4 pz, hay 2 pz)",
  "faltantes": [
    {"ingrediente":"Tortilla","requerido":4,"disponible":2,"unidad":"pz"}
  ]
}
```

**409 cerrado:**
```json
{
  "message": "Tacos El Gordo no está aceptando pedidos: Cerrado · abre mañana a las 12:00.",
  "estado": { "abierto": false, "mensaje":"...", "proxima_apertura":"12:00", ...}
}
```

**422 fuera de radio:**
```json
{
  "message": "Tu dirección está fuera del radio de entrega (5 km). Distancia: 7.3 km."
}
```

### Comportamiento

1. Resuelve local por slug (`activos()`).
2. Verifica horario con `HorarioCalculator::estado`.
3. Si delivery + coords del cliente + coords del local → valida radio (haversine).
4. `OrderService::crear` (transaccional):
   - snapshot precios + extras
   - crea Pedido + DetallePedido
   - descuenta inventario con `lockForUpdate`
   - genera `whatsapp_url`
5. El cliente abre la URL `wa.me` retornada.

Ver flujo end-to-end en [`features/pedidos.md`](../features/pedidos.md).
