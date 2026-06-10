# Infra — Setup nativo (sin Docker)

Para Windows con WAMP o Mac/Linux con PHP + MySQL instalados localmente.

## Prerrequisitos

- PHP 8.3 con extensiones: `pdo_mysql`, `bcmath`, `zip`, `intl`, `gd`, `opcache`, `pcntl`, `mbstring`.
- Composer 2.x.
- MySQL 8.x.
- Node 20.x + npm.
- Puerto libre `8080` y `3000`.

### Verificar PHP
```bash
php -v
php -m | grep -E 'pdo_mysql|bcmath|zip|intl|gd|mbstring'
```

## Pasos

### Backend
```bash
cd apps/api
composer install
cp .env.example .env
```

Editar `apps/api/.env`:
```env
APP_URL=http://localhost:8080
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=clicktoeat
DB_USERNAME=root
DB_PASSWORD=     # según tu WAMP/MySQL local
FRONTEND_URL=http://localhost:3000
```

Continuar:
```bash
php artisan key:generate

# Crear la BD si no existe (en MySQL)
mysql -u root -p -e "CREATE DATABASE clicktoeat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

php artisan migrate --seed
php artisan storage:link
php artisan l5-swagger:generate

# Servidor
php artisan serve --port=8080
```

### Frontend
En otra terminal:
```bash
cd apps/web
npm install
cp .env.local.example .env.local
# editar si hace falta — los defaults asumen API en :8080
npm run dev
```

## Verificar

| URL                            | Espera                                |
|-------------------------------|---------------------------------------|
| http://localhost:3000          | Directorio con los locales demo        |
| http://localhost:8080/api/v1/public/locales | JSON                       |
| http://localhost:8080/api/documentation     | Swagger UI                  |

## Credenciales demo

Mismas que con Docker:

| Email                                       | Password      | Rol           |
|--------------------------------------------|---------------|---------------|
| `admin@ClickToEat.app`                      | `password123` | super_admin   |
| `owner+tacos-el-gordo@ClickToEat.app`        | `password123` | owner          |
| `owner+pizza-bambino@ClickToEat.app`         | `password123` | owner          |

## Comandos útiles

```bash
# Backend
cd apps/api
php artisan migrate:fresh --seed      # wipe + reseed
php artisan tinker                     # REPL
vendor/bin/phpunit                     # tests (sqlite in-memory)
vendor/bin/pint                        # PHP CS fixer

# Frontend
cd apps/web
npm run lint
npm run typecheck
npm run build
```

## Diferencias importantes vs Docker

| Aspecto                | Docker                            | Nativo                           |
|------------------------|-----------------------------------|----------------------------------|
| BD                     | `clickeat` user `clickeat`        | `clicktoeat` user típicamente `root` |
| Puerto MySQL host      | `3307`                             | `3306`                            |
| Storage de uploads     | Bind-mount al host                 | Local en `apps/api/storage/`     |
| Composer install       | Dentro del contenedor              | En la máquina                    |
| Versión PHP            | Garantizada 8.3                    | La que tengas (ojo)              |

## Problemas comunes

| Síntoma                                  | Causa / Fix                                       |
|-----------------------------------------|---------------------------------------------------|
| `pdo_mysql not found`                    | Instalar extensión PHP y reiniciar Apache/PHP-FPM |
| `Class "GD\Image" not found`             | Falta `gd` con freetype/jpeg — recompilar PHP    |
| `Access denied for user 'root'@'localhost'` | Cambiar `DB_PASSWORD` en `.env`                |
| Imágenes no se ven después de subir       | Falta `php artisan storage:link`                  |
| `axios: Network Error` desde el frontend  | CORS — verifica `FRONTEND_URL=http://localhost:3000` |
| Permisos en `storage/`                    | `chmod -R 775 storage bootstrap/cache`            |
