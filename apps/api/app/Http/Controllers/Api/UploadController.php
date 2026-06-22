<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Upload\StoreImageRequest;
use App\Services\Images\ImageUploader;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Tag(name="Uploads", description="Sube imágenes al disco público. Devuelve url + public_id.")
 *
 * SEV-12 nota: la autorización vive en StoreImageRequest::authorize() que
 * llama a $user->can('uploadImage', Producto::class) — eso ES el patrón
 * canónico Laravel de auth via FormRequest. Equivalente a $this->authorize
 * en el controller. Audit 2026-06-19 lo flageó por "no authorize en
 * controller" pero el FormRequest cumple el contrato.
 */
class UploadController extends Controller
{
    public function __construct(protected ImageUploader $uploader) {}

    /**
     * @OA\Post(
     *     path="/uploads/image",
     *     tags={"Uploads"},
     *     security={{"sanctum":{}}},
     *     summary="Sube una imagen al servidor.",
     *     @OA\RequestBody(required=true, @OA\MediaType(
     *         mediaType="multipart/form-data",
     *         @OA\Schema(
     *             required={"image"},
     *             @OA\Property(property="image", type="string", format="binary"),
     *             @OA\Property(property="folder", type="string", enum={"productos","locales","banners","logos"})
     *         )
     *     )),
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreImageRequest $request): JsonResponse
    {
        $result = $this->uploader->upload(
            $request->file('image'),
            $request->input('folder', 'productos'),
        );

        return response()->json([
            'data' => $result,
        ], 201);
    }
}
