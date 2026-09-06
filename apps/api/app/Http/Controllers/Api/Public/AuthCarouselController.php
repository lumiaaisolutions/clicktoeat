<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\AuthCarouselSlide;
use Illuminate\Http\JsonResponse;

/**
 * Endpoint público (sin auth) que alimenta el carrusel de login/registro.
 * Devuelve solo los slides activos. Si está vacío, el frontend usa sus
 * slides por defecto. Ver docs/features/auth-login-redesign.md.
 */
class AuthCarouselController extends Controller
{
    public function index(): JsonResponse
    {
        $slides = AuthCarouselSlide::where('activo', true)
            ->orderBy('orden')
            ->orderBy('id')
            ->get()
            ->map(fn (AuthCarouselSlide $s) => [
                'imagen_url' => $s->imagen_url,
                'tags' => $s->tags ?? [],
                'quote' => $s->quote,
                'source' => $s->source,
                'role' => $s->role,
            ]);

        return response()->json(['data' => $slides]);
    }
}
