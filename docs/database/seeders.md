# Base de datos — Seeders

`apps/api/database/seeders/`

Ejecutar todos:
```bash
php artisan migrate --seed
# o sólo seedear:
php artisan db:seed
```

## DatabaseSeeder

Orquesta el orden:

```php
$this->call([
    UsuariosSeeder::class,
    LocalesSeeder::class,
    InventarioSeeder::class,
    PostresStitchSeeder::class,
]);
```

## UsuariosSeeder

Crea el **único super admin** del sistema. `updateOrCreate` por email → idempotente.

| Email                  | Password      | Rol           |
|------------------------|---------------|---------------|
| `admin@ClickToEat.app` | `password123` | `super_admin` |

## LocalesSeeder

Crea dos locales demo (con sus owners, categorías, productos y extras), portados del prototipo legacy. Idempotente por `slug` y por email.

| Slug              | Owner email                                |
|-------------------|--------------------------------------------|
| `tacos-el-gordo`   | `owner+tacos-el-gordo@ClickToEat.app`      |
| `pizza-bambino`    | `owner+pizza-bambino@ClickToEat.app`       |

Ambos owners: password `password123`.

URLs públicas resultantes:
- `http://localhost:3000/tacos-el-gordo`
- `http://localhost:3000/pizza-bambino`

## InventarioSeeder

Pobla ingredientes + recetas para los productos de los locales demo. Sirve para probar el descuento automático de stock al recibir pedidos.

## PostresStitchSeeder

Crea un tercer set de productos (postres temáticos) con extras y combinaciones para hacer pruebas más visuales del menú.

---

## Cuándo correr seeders

- **Primera vez** que se levanta el proyecto: `php artisan migrate --seed`.
- **Después de un wipe** de BD: `php artisan migrate:fresh --seed`.
- **Tests**: cada test que necesita datos los crea explícitamente (no usa estos seeders).

## Cuándo NO

- En **producción**, salvo `UsuariosSeeder` para crear el super_admin inicial.
- Los demás seeders contienen datos de demo, no deberían correr en prod.

## Cómo agregar un seeder

1. `php artisan make:seeder NombreSeeder` → crea `database/seeders/NombreSeeder.php`.
2. Implementar `run()`. Usar `updateOrCreate` por una columna estable para idempotencia.
3. Agregar al `DatabaseSeeder::run()` en el orden correcto (las FKs importan).
4. Documentar aquí.
