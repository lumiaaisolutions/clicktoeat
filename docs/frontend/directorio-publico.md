# Frontend — Directorio público (home)

> `apps/web/src/app/page.tsx` + `apps/web/src/app/DirectoryClient.tsx`.
>
> Esta es la home pública: el directorio de locales activos en la plataforma.
> No confundir con la landing individual de cada local (`/[slug]` — ver
> [`landing.md`](./landing.md)).

## Composición

`DirectoryClient` es un Client Component que orquesta toda la home. Cada
sección está modularizada por dominio en `components/landing/`:

```
DirectoryClient (orquestador)
├── BurgerSequence             (fixed canvas a la derecha — todo el scroll)
├── Hero                       (in-file — scroll parallax + counter + stats)
├── NearbySection              (condicional — usuario activó geolocalización)
├── SearchBar sticky           (in-file)
├── Favoritos                  (localStorage)
├── Catálogo de locales        (cards grid con tilt 3D + spotlight)
├── ScrollPhoneSequence        (4 frames SVG/HTML sincronizados con scroll)
├── WhyClickToEatSection       (4 features editorial 01-04)
├── SystemPreviewSection       (texto + mockup admin con parallax)
├── CTAOwnerSection            (in-file — phone mockup + checklist)
├── ShareQRSection             (in-file)
└── Footer                     (in-file — link a LUMIA)
```

El layout de cada componente está documentado en
[`landing-sections.md`](./landing-sections.md). Las animaciones siguen los
patrones canónicos en [`scroll-animations.md`](./scroll-animations.md).

## Data flow

```
page.tsx (RSC, force-dynamic)
   │
   ├─ fetch(`${NEXT_PUBLIC_API_URL}/public/locales`, cache: 'no-store')
   │     └─ Recibe MenuResource[] (id, slug, nombre, lat, lng, estado, …)
   │
   └─ <DirectoryClient locales={…} />
        │
        └─ useState para: query, favoritos, onlyOpen, userCoords, nearby
```

Sin SWR ni cache cliente — la home es server-rendered cada visita
(`force-dynamic`) porque el ranking/estado cambia segundo a segundo.

## Geolocalización ("Negocios cerca de ti")

Patrón:

```ts
navigator.geolocation.getCurrentPosition(
  (pos) => setUserCoords({ lat, lng }),
  (err) => setGeoError(humanReadable(err)),
  { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
);
```

Distancia con Haversine (implementada inline en `DirectoryClient.tsx`):
- Radio configurable: `NEARBY_RADIUS_KM = 15`
- Se filtran locales con `lat` y `lng` no-null
- Se ordenan ascendente por distancia
- Top 6 se muestran en la sección colapsable

Errores manejados:
- `PERMISSION_DENIED` → mensaje específico (cómo reactivar)
- Timeout / no soporte → mensaje genérico

## Favoritos

`localStorage['clicktoeat:favs']` = `Set<slug>`. Persistencia client-only,
sin auth. Hidratación: el primer render server-side asume `favs = ∅` para
evitar mismatch; tras `useEffect` se lee localStorage y se re-renderiza.

## Estado abierto/cerrado

`abiertoDe(local)` lee `local.estado.abierto` (computado **server-side** en
`HorarioCalculator::estado()`). Nunca se recalcula con `new Date()` en
cliente — causa hydration mismatch porque la TZ del runner y del cliente
pueden diferir.

## Donde se renderiza qué

| URL | Componente | Notas |
|-----|------------|-------|
| `/` | `DirectoryClient` | Esta página |
| `/{slug}` | `LandingClient` | Landing de cada local — ver [`landing.md`](./landing.md) |
| `/admin/*` | `apps/web/src/app/admin/*` | Panel — ver [`admin.md`](./admin.md) |

## Tests

No hay tests unitarios del directorio. Verificación visual + CI con
`tsc --noEmit` + `next build`.
