# ADR-006: Uploads a disco local (interim, no Cloudinary)

> **Status:** aceptada interim — **a revisar** cuando se pase a producción horizontal
> **Fecha:** 2026-06-10
> **Decisores:** equipo inicial

## Contexto

El README original mencionaba Cloudinary como el servicio de imágenes (clave `public_id`, env vars `CLOUDINARY_*`). La implementación real (`App\Services\Images\ImageUploader`) escribe al disco `public` local de Laravel (`storage/app/public/uploads/`).

Esto generó una **discrepancia** entre lo documentado y lo implementado, ahora cerrada en favor del comportamiento real.

## Decisión

**Hoy**: usamos disco local. `apps/api/storage/app/public/uploads/{folder}/` con `storage:link` que expone como `/storage/...`.

- El campo `imagen_public_id` en BD guarda la **ruta relativa al disco** (`uploads/productos/foo-abcd.png`), no un ID Cloudinary opaco. El nombre `public_id` se conserva por compatibilidad de schema.
- El `ImageUploader::destroy()` acepta el formato actual y un legacy `local:prefix/...`.

**Mañana**: cuando el backend se despliegue a producción con más de un pod / instancia, esto no escala (cada pod sólo ve sus uploads). Migrar a una de:

1. **Cloudinary** — agregar SDK, reimplementar `ImageUploader` con `Cloudinary::upload()`.
2. **S3 / R2 / Spaces** — `FILESYSTEM_DISK=s3` + driver `league/flysystem-aws-s3-v3`. Sin cambios al `ImageUploader` (Storage facade abstrae).
3. **Volumen NFS** compartido — menos elegante, válido para deploy simple monolítico.

## Alternativas consideradas (para hoy)

- **Cloudinary directamente desde el inicio** → descartada. Requería credenciales del equipo, generaba fricción en dev local (cada dev necesita su cuenta o una compartida).
- **S3 local con MinIO** → descartada. Otro contenedor más, otra pieza que mantener.
- **Disco local** (la decisión actual) → simple, rápido en dev, "funciona y se documenta para reemplazar después".

## Consecuencias

### Positivas

- Dev local arranca con `docker compose up`, sin credenciales externas.
- Sin gasto recurrente en CDN durante MVP.
- Implementación trivial (50 líneas).

### Negativas

- **No escala horizontalmente.** Si el contenedor api se escala a 2+, las uploads en uno no se ven en otro.
- **Sin CDN / edge caching.** Las imágenes se sirven desde el origen.
- **Sin resize automático.** Una foto de 5 MB se sirve a 5 MB en la landing.
- **Sin WebP/AVIF conversion.** Lo que suban, se sirve tal cual.
- **Sin antivirus** del archivo subido.
- Si el contenedor api se destruye en dev sin volumen, las uploads se pierden.

### Neutras

- Validación de tamaño/formato vive en `Upload/StoreImageRequest` y es independiente del backend de storage — sobrevive a la migración.

## Cuándo reabrir

- Antes de pasar a producción multi-instancia.
- Cuando las imágenes empiecen a representar > 100 MB / mes y un CDN se justifique.
- Si se introducen requisitos de scan AV / moderación de contenido.

## Migration path sugerido (cuando se decida)

1. Decidir provider (Cloudinary vs S3 vs R2).
2. Si Cloudinary: `composer require cloudinary/cloudinary_php`, reimplementar `ImageUploader::upload/destroy`, persistir el `public_id` real (string opaco).
3. Si S3-compatible: cambiar `FILESYSTEM_DISK` + config, no toca código.
4. **Migrar imágenes existentes** con un comando Artisan que tome cada `imagen_public_id` local, lo suba al nuevo storage y actualice la BD.
5. Cleanup del símlink `public/storage` y del directorio `storage/app/public/uploads`.

Ver [`docs/features/uploads.md`](../features/uploads.md).
