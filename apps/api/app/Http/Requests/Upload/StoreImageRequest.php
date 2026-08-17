<?php

namespace App\Http\Requests\Upload;

use App\Models\Producto;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class StoreImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('uploadImage', Producto::class);
    }

    public function rules(): array
    {
        return [
            // La regla built-in `image` de Laravel rechaza AVIF (su whitelist
            // interna está hardcodeada a jpg/jpeg/png/gif/bmp/svg/webp y nunca
            // se actualizó) — combinarla con `mimetypes` (que sí reconoce AVIF
            // via content-sniffing) hacía que cualquier AVIF real fallara aquí
            // aunque el mensaje de error prometiera soportarlo. `mimetypes` ya
            // cubre lo que `image` verificaba, con la whitelist correcta.
            'image' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/avif', 'max:5120'],
            'folder' => ['nullable', Rule::in(['productos', 'locales', 'banners', 'logos'])],
        ];
    }

    public function messages(): array
    {
        // Mensaje claro cuando PHP rechazó el upload por superar
        // upload_max_filesize / post_max_size de php.ini (max:5120 dispara
        // este caso porque el archivo llega vacío).
        return [
            'image.max' => 'La imagen supera el tamaño permitido por el servidor. Reduce el archivo a menos de 5 MB.',
            'image.uploaded' => 'La imagen excede el límite del servidor (upload_max_filesize). Sube una imagen más pequeña.',
            'image.required' => 'Selecciona una imagen para subir.',
            'image.mimetypes' => 'Formato no soportado. Usa JPG, PNG, WebP o AVIF.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::info('Upload 422', [
            'content_type' => $this->header('Content-Type'),
            'has_image' => $this->hasFile('image'),
            'files_keys' => array_keys($this->allFiles()),
            'errors' => $validator->errors()->toArray(),
        ]);

        parent::failedValidation($validator);
    }
}
