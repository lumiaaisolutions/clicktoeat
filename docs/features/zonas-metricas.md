# Métricas por zona / ciudad

Vista de mapa para el `super_admin` que pinta cada local con un círculo
proporcional a sus **ventas del mes**, sumarizado por ciudad. Útil para:

- Identificar zonas calientes que merecen más marketing.
- Detectar locales subutilizados que tal vez necesitan onboarding.
- Decisiones de expansión geográfica.

## Endpoint

```
GET /api/v1/admin/metricas-zonas        super_admin

Response shape:
{
  "data": [
    {
      "id": 1,
      "nombre": "Tacos El Gordo",
      "slug":   "tacos-el-gordo",
      "ciudad": "Monterrey",
      "estado": "Nuevo León",
      "lat":    25.6866,
      "lng":   -100.3161,
      "ventas_mes":  18450.50,
      "pedidos_mes": 87
    },
    ...
  ]
}
```

Locales sin `lat`/`lng` capturados se excluyen — el endpoint devuelve
solo los geolocalizados.

## Frontend

- `apps/web/src/app/admin/zonas/page.tsx` — layout en 2 columnas con mapa
  y ranking de top ciudades, más tabla detallada debajo.
- `apps/web/src/components/admin/ZonasMap.tsx` — Leaflet con
  `CircleMarker` por local, radio ∝ √(ventas/max), color hashed por
  ciudad. Popup con nombre + ventas + pedidos. `fitBounds` automático.

## Notas técnicas

- Reutilizamos OpenStreetMap tiles (sin API key).
- El componente del mapa carga Leaflet dinámicamente (`next/dynamic`,
  `ssr: false`) para evitar el `window is not defined` en SSR.
- El radio del círculo crece con la raíz cuadrada del volumen para que
  un local 100× no aparezca 100× más grande visualmente.
