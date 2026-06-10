# Arquitectura — Layout del monorepo

```
clicktoeat/
├── apps/
│   ├── api/                # Laravel 11 (PHP 8.3) — backend multi-tenant
│   └── web/                # Next.js 14 (TS) — landing + panel admin
├── bd/
│   └── bdclicktoeat.sql    # Dump SQL de referencia (ojo: ver issues/discrepancias-readme.md)
├── docker/
│   ├── nginx/default.conf  # Reverse proxy → php-fpm
│   ├── php/Dockerfile      # PHP 8.3 + extensiones
│   ├── php/php.ini         # opcache, upload limit, etc.
│   └── mysql/init.sql      # Crea BD `clickeat` y `clickeat_testing`
├── legacy-prototype/       # Prototipo JSX original — referencia visual, no se ejecuta
├── docker-compose.yml      # api / nginx / mysql / web
├── .env.example            # Variables compartidas (Cloudinary, URLs)
├── .gitignore
├── composer.phar           # Composer embebido (atajo para entornos sin Composer global)
└── README.md
```

## Qué vive en cada carpeta

### `apps/api/` (Laravel)

```
app/
├── Http/
│   ├── Controllers/Api/    # Controllers por recurso, agrupados Public/, Admin/
│   ├── Middleware/         # tenant, super_admin
│   ├── Requests/           # FormRequest por acción (validación)
│   └── Resources/          # Transformers de respuesta JSON
├── Models/
│   ├── Concerns/           # Trait BelongsToTenant
│   ├── Scopes/             # TenantScope (GlobalScope)
│   └── *.php               # Local, User, Producto, Pedido, ...
├── Policies/               # Autorización por modelo
├── Providers/              # AppServiceProvider (singleton tenant), AuthServiceProvider
├── Services/               # Lógica de negocio (Orders, Inventory, Compras, Metricas, ...)
└── Support/                # TenantContext, HorarioCalculator (utilidades)

bootstrap/app.php            # Punto único: registra middleware, alias, exceptions
config/                      # auth, sanctum, cors, database, l5-swagger, ...
database/
├── migrations/              # Schema versionado
└── seeders/                 # UsuariosSeeder + LocalesSeeder (tacos / pizza demo) + Inventario + PostresStitch
routes/api.php               # TODA la API. Auto-prefijada con /api/v1
tests/Feature/               # PHPUnit (sqlite en memoria)
```

### `apps/web/` (Next.js)

```
src/
├── app/
│   ├── layout.tsx           # Root layout + fuentes
│   ├── page.tsx             # Directorio público de locales (Server Component)
│   ├── DirectoryClient.tsx  # Cliente del directorio
│   ├── [slug]/              # Landing por local (RSC + cliente)
│   ├── login/               # Login del panel
│   └── admin/               # Panel del owner (todas las páginas)
│       ├── layout.tsx
│       ├── page.tsx
│       ├── branding/  categorias/  compras/  horarios/
│       ├── inventario/  locales/  metricas/  pedidos/
│       ├── perfil/  productos/  punto-venta/  qr/
├── components/
│   ├── ui/                  # Button, Modal, FormField, Logo, QRCode, Skeleton, Toaster
│   └── admin/               # ImageUpload, LeafletMap, LocationPicker, NotificacionesBell
├── store/                   # Zustand: auth, cart, notificaciones, toast
└── lib/                     # api (axios), types, utils, whatsapp (espejo del PHP builder)

server.js                    # Servidor Node mínimo para `next start` (no se usa en dev)
next.config.mjs              # Permite imágenes remotas del dominio API prod
tailwind.config.ts           # Colores via CSS vars, breakpoints custom (xs:380px)
```

### `legacy-prototype/`

Prototipo en JSX/CSS plano que sirvió como referencia de UX/datos al construir la versión actual. **No se ejecuta**, sólo se mantiene como referencia visual de lo que el sistema debe poder hacer.

## Por qué monorepo

- API y frontend tienen el mismo ciclo de cambios (cada feature toca ambos).
- Compartir tipos / formatos (ej. mensaje WhatsApp) sin publicar paquetes.
- Un `docker-compose up -d` levanta todo.

## Aliases TS

`apps/web/tsconfig.json` define `@/*` → `./src/*`. Siempre usar `@/lib/api`, `@/store/auth`, etc.
