# Frontend — Geolocalización "Negocios cerca de ti"

> Botón en el hero del directorio público que pide la ubicación del cliente y
> filtra el directorio por distancia. Vive en `DirectoryClient.tsx`.

## UX

1. Cliente hace click en **"Negocios cerca de ti"**.
2. Navegador pide permiso de ubicación (HTML5 Geolocation API).
3. Si concede → la página calcula distancia a cada local con `lat/lng`
   registrado, filtra dentro del radio y muestra una sección
   colapsable con cards ordenadas por proximidad.
4. Si deniega → mensaje claro pidiendo reactivar el permiso.

## Implementación

### Pedir ubicación

```ts
navigator.geolocation.getCurrentPosition(
  (pos) => {
    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setNearbyActive(true);
    document.getElementById('cerca-de-ti')?.scrollIntoView({ behavior: 'smooth' });
  },
  (err) => {
    setGeoError(
      err.code === err.PERMISSION_DENIED
        ? 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'
        : 'No pudimos obtener tu ubicación. Intenta de nuevo.',
    );
  },
  { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
);
```

Opciones:
- `enableHighAccuracy: true` — fuerza GPS cuando está disponible (más preciso pero más lento).
- `timeout: 10_000` — si no responde en 10 s, error.
- `maximumAge: 60_000` — si el browser tiene una posición cacheada de hace <60 s, la usa.

### Cálculo de distancia (Haversine)

```ts
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;                                  // radio terrestre en km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

Sin libs externas — Haversine es 6 líneas y suficiente para distancias
< 200 km (error <0.5%).

### Filtrado y orden

```ts
const NEARBY_RADIUS_KM = 15;

const nearbyList = useMemo(() => {
  if (!userCoords) return [];
  return withDistance
    .filter((l) => l.distancia != null && l.distancia <= NEARBY_RADIUS_KM)
    .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
}, [withDistance, userCoords]);
```

`withDistance` es el array completo de locales con `distancia` ya calculada
(o `null` si el local no tiene `lat/lng` registrado).

## Errores manejados

| Error | Causa | Mensaje al usuario |
|-------|-------|---------------------|
| `PERMISSION_DENIED` | El usuario rechazó el prompt o tiene bloqueado el origen | "Permiso de ubicación denegado. Actívalo en la configuración del navegador." |
| `POSITION_UNAVAILABLE` / Timeout | Sin GPS, sin red, browser sin soporte | "No pudimos obtener tu ubicación. Intenta de nuevo." |
| `!('geolocation' in navigator)` | Browser viejísimo / iframe sin permission | "Tu navegador no soporta geolocalización." |

## Data del backend

El endpoint `GET /public/locales` ya devuelve `lat` y `lng` para cada local
en `MenuResource::toArray()`:

```php
'lat' => $this->lat !== null ? (float) $this->lat : null,
'lng' => $this->lng !== null ? (float) $this->lng : null,
```

Locales sin ubicación quedan con `lat: null` / `lng: null` y se **excluyen**
del filtro de cercanía automáticamente. Eso permite que dueños que aún no
configuraron su ubicación no aparezcan como "muy lejos" — simplemente no
aparecen en la sección "Cerca de ti".

## Privacidad

- La coordenada del usuario **nunca** se envía al servidor. Vive solo en el
  state cliente (`userCoords`) durante la sesión.
- Cierre de pestaña → coordenada se descarta.
- No se almacena en `localStorage` ni en cookies.
- Cumple LFPDPPP (no hay tratamiento de dato personal sensitivo retenido).

Ver también: [`security/data-inventory.md`](../security/data-inventory.md).

## Edge cases conocidos

- **Safari iOS** pide permiso cada vez que se llama la API si el usuario no
  marcó "Recordar" — es comportamiento esperado del browser.
- **Hostinger Business Shared** sirve HTTPS por default → Geolocation API
  funciona sin issues (la API requiere `https:` o `localhost`).
- En **localhost dev**, Safari a veces no pide permiso de ubicación con el
  primer click. Workaround: configurar `Develop → Disable Cross-Origin Restrictions`
  o usar Chrome para desarrollo.

## Ver también

- [`directorio-publico.md`](./directorio-publico.md) — Dónde se monta el botón
- [`landing-sections.md`](./landing-sections.md) — La sección colapsable que muestra los resultados
- `LocationPicker.tsx` (admin) — Usa la misma API para que el owner registre su `lat/lng`
