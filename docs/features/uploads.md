# Feature — Subida de imágenes

## Estado actual

> ⚠️ **Inconsistente con README.** El README menciona Cloudinary; la implementación real escribe a disco `public` local. Pendiente decidir camino — ver [`issues/discrepancias-readme.md`](../issues/discrepancias-readme.md).

## Endpoint

`POST /api/v1/uploads/image` — `multipart/form-data`. Throttle `30/min` adicional.

Auth: `auth:sanctum` + `tenant`. Policy: `ProductoPolicy::uploadImage` (sólo owner).

### Request

| Campo   | Tipo     | Validación                                      |
|---------|----------|-------------------------------------------------|
| `image` | file     | `required image` mimetypes `jpeg|png|webp|avif`, max **5120 KB** |
| `folder`| string   | `nullable in:productos,locales,banners,logos` (default `productos`) |

`StoreImageRequest` traduce errores al español (`messages()`) y loguea contexto en `failedValidation` para debug de límites de PHP (`upload_max_filesize`).

### 201
```json
{
  "data": {
    "url":       "http://localhost:8080/storage/uploads/productos/foo-abcd1234.png",
    "public_id": "uploads/productos/foo-abcd1234.png",
    "width":     800,
    "height":    600,
    "bytes":     124000
  }
}
```

## Servicio

`App\Services\Images\ImageUploader`:

- Sanitiza el folder con `Str::slug`.
- Genera nombre: `{slug-del-original}-{8-chars-random}.{ext}`.
- Guarda en `storage/app/public/uploads/{folder}/`.
- Computa `width`/`height` con `getimagesize`.
- Devuelve URL pública = `APP_URL` + `/storage/...`.

### Ruta pública
Para que `storage/app/public/` quede expuesto en `/storage/...`, ejecutar **una vez**:
```bash
php artisan storage:link
```
Crea el symlink `public/storage` → `storage/app/public`.

## `public_id`

Es **la ruta relativa al disco**, no un identificador opaco como Cloudinary. Ejemplo: `uploads/productos/taco-al-pastor-1a2b3c4d.png`.

Se persiste en BD (`productos.imagen_public_id`, `locales.logo_url`/`banner_url` actualmente sólo guardan URL). Sirve para poder **borrar el archivo** cuando el producto se elimina o se reemplaza la imagen.

`ImageUploader::destroy($publicId)`:
- Acepta el formato actual (`uploads/...`) o legacy con prefijo `local:` (lo desnuda).
- Llama `Storage::disk('public')->delete($publicId)`.

## Uso desde controllers

`ProductoController::update`:
```php
$previousPublicId = $producto->imagen_public_id;
$producto->update($request->validated());

if ($previousPublicId && $request->has('imagen_public_id')
    && $request->input('imagen_public_id') !== $previousPublicId) {
    $this->uploader->destroy($previousPublicId);
}
```

`ProductoController::destroy`:
```php
if ($producto->imagen_public_id) {
    $this->uploader->destroy($producto->imagen_public_id);
}
$producto->delete();
```

## Frontend

`apps/web/src/components/admin/ImageUpload.tsx` — input file + preview + envía a `/uploads/image` y devuelve `{ url, public_id }` que se persisten en el form del producto/local.

## Limitaciones

- Sin **resize automático** (un producto que sube 5 MB se sirve a 5 MB en la landing).
- Sin **CDN** ni **edge caching** (sólo `expires 7d` por nginx en archivos estáticos).
- Sin **WebP/AVIF auto-conversion** (lo que suben, se sirve).
- Sin **borrado en producción** distribuida (si la app está detrás de varios pods, el archivo subido a uno no se ve en otros — requiere storage compartido o S3).
- Sin **antivirus/scan** del archivo.

Cualquiera de estos pendientes empuja a integrar Cloudinary o un servicio similar. Mientras tanto: local-only.

## Decisión histórica

El plan original (visible en README) era Cloudinary, pero la implementación quedó local. Razón probable: simplificar dev sin credenciales externas. Para producción, esto necesita resolverse — ver [`issues/devops-faltante.md`](../issues/devops-faltante.md).
