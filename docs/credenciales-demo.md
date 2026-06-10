# Credenciales de demo

Datos del entorno de desarrollo, creados por los seeders.

## Usuarios

| Email                                       | Password      | Rol           | Local             |
|--------------------------------------------|---------------|---------------|-------------------|
| `admin@ClickToEat.app`                      | `password123` | `super_admin` | —                 |
| `owner+tacos-el-gordo@ClickToEat.app`        | `password123` | `owner`        | `tacos-el-gordo`   |
| `owner+pizza-bambino@ClickToEat.app`         | `password123` | `owner`        | `pizza-bambino`    |

> Los seeders son **idempotentes** (`updateOrCreate` por email): puedes correr `php artisan db:seed` varias veces sin duplicar.

## Locales

| Slug              | URL pública                                              | Categorías de demo |
|-------------------|---------------------------------------------------------|--------------------|
| `tacos-el-gordo`   | http://localhost:3000/tacos-el-gordo                    | Tacos, Bebidas, Postres |
| `pizza-bambino`    | http://localhost:3000/pizza-bambino                     | Pizzas, Pastas, Bebidas |

Hay productos demo con extras (`Tortilla: maíz/harina`, `Tamaño: chica/mediana/grande`, etc.) cargados por `LocalesSeeder`. Hay también un set extra de postres temáticos (`PostresStitchSeeder`).

## Cómo recrear

```bash
# Docker
docker compose exec api php artisan migrate:fresh --seed

# Nativo
cd apps/api && php artisan migrate:fresh --seed
```

⚠️ Borra todos los datos.

## Cómo cambiar el password del super_admin demo

Desde Tinker:
```bash
docker compose exec api php artisan tinker
>>> $u = App\Models\User::where('email','admin@ClickToEat.app')->first();
>>> $u->password = bcrypt('nuevo-secreto');
>>> $u->save();
>>> exit
```

O ejecuta el endpoint `/auth/me/password` autenticado.

## Producción

> ⚠️ Estas credenciales son **sólo demo**. En producción:
> - Crear super_admin con email real.
> - Password fuerte, generado por un secret manager.
> - Eliminar (o no correr) `LocalesSeeder` / `InventarioSeeder` / `PostresStitchSeeder`.
> - Considerar renombrar `admin@ClickToEat.app` a algo más específico (`admin@yourdomain.mx`).
