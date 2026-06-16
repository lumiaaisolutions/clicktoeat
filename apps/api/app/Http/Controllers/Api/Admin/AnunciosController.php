<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AnuncioGlobal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnunciosController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AnuncioGlobal::orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $req): JsonResponse
    {
        $data = $this->rules($req);
        $a = AnuncioGlobal::create($data);
        return response()->json(['data' => $a], 201);
    }

    public function update(Request $req, AnuncioGlobal $anuncio): JsonResponse
    {
        $anuncio->update($this->rules($req, true));
        return response()->json(['data' => $anuncio->fresh()]);
    }

    public function destroy(AnuncioGlobal $anuncio): JsonResponse
    {
        $anuncio->delete();
        return response()->json(null, 204);
    }

    private function rules(Request $req, bool $update = false): array
    {
        $rules = [
            'titulo'   => [$update ? 'sometimes' : 'required', 'string', 'max:120'],
            'body'     => [$update ? 'sometimes' : 'required', 'string', 'max:2000'],
            'severity' => ['sometimes', 'in:info,warning,success,danger'],
            'active'   => ['sometimes', 'boolean'],
            'show_to_super' => ['sometimes', 'boolean'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at'   => ['sometimes', 'nullable', 'date'],
        ];
        return $req->validate($rules);
    }
}
