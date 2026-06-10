<?php

namespace App\Http\Requests\Receta;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncRecetaRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Editar la receta de un producto está al mismo nivel de privilegio
        // que editar el producto mismo → reusamos ProductoPolicy::update.
        return $this->user()->can('update', $this->route('producto'));
    }

    public function rules(): array
    {
        $localId    = $this->user()->local_id;
        $productoId = $this->route('producto')?->id;

        return [
            'recetas'                            => ['present', 'array', 'max:100'],

            // Una línea = ingrediente directo  O  componente compuesto (mutuamente excluyentes)
            'recetas.*.ingrediente_id'           => [
                'nullable', 'required_without:recetas.*.componente_producto_id', 'integer',
                Rule::exists('ingredientes', 'id')->where('local_id', $localId),
            ],
            'recetas.*.componente_producto_id'   => [
                'nullable', 'required_without:recetas.*.ingrediente_id', 'integer',
                function ($attr, $value, $fail) use ($productoId) {
                    if ($value !== null && (int) $value === (int) $productoId) {
                        $fail('Un producto no puede ser componente de sí mismo.');
                    }
                },
                Rule::exists('productos', 'id')->where('local_id', $localId),
            ],
            'recetas.*.cantidad'                 => ['required', 'numeric', 'min:0.001', 'max:999999.999'],
        ];
    }
}
