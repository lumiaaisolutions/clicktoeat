<?php

namespace App\Services\Images;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Sube imágenes locales al disco `public` y devuelve { url, public_id }.
 *
 * `public_id` es la ruta relativa al disco (`uploads/logos/foo.png`), se
 * persiste en BD para poder borrar el archivo cuando el usuario reemplaza la
 * imagen o elimina el producto/local.
 */
class ImageUploader
{
    /** @var list<string> */
    protected const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif'];

    protected const MAX_BYTES = 5 * 1024 * 1024;

    public function upload(UploadedFile $file, string $folder = 'productos'): array
    {
        $this->guardFileSize($file);
        $this->guardExtension($file);
        $folder = $this->sanitizeFolder($folder);

        $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $base = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) ?: 'img';
        $name = $base.'-'.Str::lower(Str::random(8)).'.'.$ext;
        $relative = "uploads/{$folder}/{$name}";

        $stored = $file->storeAs("uploads/{$folder}", $name, 'public');
        if (! $stored) {
            throw new RuntimeException('No se pudo guardar la imagen.');
        }

        [$w, $h] = @getimagesize(Storage::disk('public')->path($relative)) ?: [null, null];

        return [
            'url'       => rtrim(config('app.url'), '/').'/storage/'.$relative,
            'public_id' => $relative,
            'width'     => $w,
            'height'    => $h,
            'bytes'     => $file->getSize(),
        ];
    }

    /**
     * Elimina una imagen del disco. Acepta tanto el `public_id` nuevo
     * (`uploads/...`) como el legacy con prefijo `local:`.
     */
    public function destroy(?string $publicId): bool
    {
        if (! $publicId) {
            return false;
        }
        if (str_starts_with($publicId, 'local:')) {
            $publicId = substr($publicId, strlen('local:'));
        }
        return Storage::disk('public')->delete($publicId);
    }

    protected function guardFileSize(UploadedFile $file): void
    {
        if ($file->getSize() > self::MAX_BYTES) {
            throw new RuntimeException('La imagen excede '.self::MAX_BYTES.' bytes.');
        }
    }

    protected function guardExtension(UploadedFile $file): void
    {
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, self::ALLOWED_EXT, true)) {
            throw new RuntimeException("Formato no permitido: {$ext}.");
        }
    }

    protected function sanitizeFolder(string $folder): string
    {
        $folder = Str::slug($folder);
        return $folder !== '' ? $folder : 'productos';
    }
}
