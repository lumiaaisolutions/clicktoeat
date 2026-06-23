<?php

namespace App\Http\Requests\Gastos;

use Illuminate\Foundation\Http\FormRequest;

class UploadComprobanteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('gasto')) ?? false;
    }

    public function rules(): array
    {
        return [
            'comprobante' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'comprobante.required' => 'Selecciona el archivo del comprobante.',
            'comprobante.mimes'    => 'El comprobante debe ser una imagen (JPG/PNG/WEBP) o un PDF.',
            'comprobante.max'      => 'El comprobante no puede pesar más de 5 MB.',
        ];
    }
}
