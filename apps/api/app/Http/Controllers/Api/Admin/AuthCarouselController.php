<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthCarouselSlide;
use App\Services\Images\ImageUploader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD super_admin del carrusel de login/registro (config global de plataforma).
 * Ver docs/features/auth-login-redesign.md.
 */
class AuthCarouselController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AuthCarouselSlide::orderBy('orden')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $req): JsonResponse
    {
        $slide = AuthCarouselSlide::create($this->rules($req));

        return response()->json(['data' => $slide], 201);
    }

    public function update(Request $req, AuthCarouselSlide $slide): JsonResponse
    {
        $slide->update($this->rules($req, true));

        return response()->json(['data' => $slide->fresh()]);
    }

    public function destroy(AuthCarouselSlide $slide): JsonResponse
    {
        $slide->delete();

        return response()->json(null, 204);
    }

    public function upload(Request $req, ImageUploader $uploader): JsonResponse
    {
        $req->validate([
            'image' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp,image/avif', 'max:5120'],
        ]);

        $result = $uploader->upload($req->file('image'), 'auth-carousel');

        return response()->json(['data' => $result], 201);
    }

    private function rules(Request $req, bool $update = false): array
    {
        return $req->validate([
            'quote' => [$update ? 'sometimes' : 'required', 'string', 'max:400'],
            'source' => ['sometimes', 'nullable', 'string', 'max:120'],
            'role' => ['sometimes', 'nullable', 'string', 'max:120'],
            'imagen_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'tags' => ['sometimes', 'nullable', 'array', 'max:4'],
            'tags.*' => ['string', 'max:40'],
            'orden' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'activo' => ['sometimes', 'boolean'],
        ]);
    }
}
