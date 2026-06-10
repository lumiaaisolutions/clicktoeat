<?php

namespace App\Http\Requests\Local;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHorariosRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->isOwner() || $user->isSuperAdmin()) && $user->local_id !== null;
    }

    public function rules(): array
    {
        return [
            'horarios'              => ['present', 'array', 'max:7'],
            'horarios.*.dia'        => ['required', 'in:lun,mar,mie,jue,vie,sab,dom'],
            'horarios.*.open'       => ['required', 'date_format:H:i'],
            'horarios.*.close'      => ['required', 'date_format:H:i'],

            'cerrado_temporal'      => ['sometimes', 'boolean'],
            'zona_horaria'          => ['sometimes', 'string', 'timezone'],
        ];
    }
}
