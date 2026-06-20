<?php

namespace App\Http\Requests\Upload;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class StoreImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('uploadImage', \App\Models\Producto::class);
    }

    public function rules(): array
    {
        return [
            'image'  => ['required', 'file', 'image', 'mimetypes:image/jpeg,image/png,image/webp,image/avif', 'max:5120'],
            'folder' => ['nullable', Rule::in(['productos', 'locales', 'banners', 'logos'])],
        ];
    }

    public function messages(): array
    {
        // Mensaje claro cuando PHP rechazó el upload por superar
        // upload_max_filesize / post_max_size de php.ini (max:5120 dispara
        // este caso porque el archivo llega vacío).
        return [
            'image.max'      => 'La imagen supera el tamaño permitido por el servidor. Reduce el archivo a menos de 5 MB.',
            'image.uploaded' => 'La imagen excede el límite del servidor (upload_max_filesize). Sube una imagen más pequeña.',
            'image.required' => 'Selecciona una imagen para subir.',
            'image.image'    => 'El archivo debe ser una imagen (JPG, PNG, WebP o AVIF).',
            'image.mimetypes'=> 'Formato no soportado. Usa JPG, PNG, WebP o AVIF.',
        ];
    }

    protected function failedValidation(Validator $validator): void
    {
        Log::info('Upload 422', [
            'content_type' => $this->header('Content-Type'),
            'has_image'    => $this->hasFile('image'),
            'files_keys'   => array_keys($this->allFiles()),
            'errors'       => $validator->errors()->toArray(),
        ]);

        parent::failedValidation($validator);
    }
}
