<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\MenuResource;
use App\Models\Local;
use App\Support\HorarioCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @OA\Tag(name="Menú público", description="Datos de la landing por slug. No requiere auth.")
 */
class MenuController extends Controller
{
    /**
     * @OA\Get(
     *     path="/public/locales",
     *     tags={"Menú público"},
     *     summary="Lista de locales activos (para el directorio público).",
     *     @OA\Response(response=200, description="OK")
     * )
     */
    public function index(): AnonymousResourceCollection
    {
        $locales = Local::query()
            ->activos()
            ->withCount(['productos' => fn ($q) => $q->where('disponible', true)])
            ->orderBy('nombre')
            ->get();

        return MenuResource::collection($locales);
    }

    /**
     * @OA\Get(
     *     path="/public/menu/{slug}",
     *     tags={"Menú público"},
     *     summary="Devuelve datos del local + categorías + productos disponibles.",
     *     @OA\Parameter(name="slug", in="path", required=true, @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="OK"),
     *     @OA\Response(response=404, description="Not Found")
     * )
     */
    public function show(string $slug): JsonResponse
    {
        $local = Local::query()
            ->activos()
            ->bySlug($slug)
            ->with([
                'categorias' => fn ($q) => $q->where('activo', true)->orderBy('orden'),
                'productos'  => fn ($q) => $q->where('disponible', true)->orderBy('orden'),
                'productos.categoria:id,slug,nombre',
            ])
            ->first();

        if (! $local) {
            throw new NotFoundHttpException('Local no encontrado o no disponible.');
        }

        return response()->json([
            'data' => [
                'local'      => [
                    'id'          => $local->id,
                    'nombre'      => $local->nombre,
                    'slug'        => $local->slug,
                    'tagline'     => $local->tagline,
                    'whatsapp'    => $local->whatsapp,
                    'telefono'    => $local->telefono,
                    'direccion'   => $local->direccion,
                    'lat'         => $local->lat,
                    'lng'         => $local->lng,
                    'horarios'    => $local->horarios,
                    'estado'      => HorarioCalculator::estado($local),
                    'redes'       => $local->redes_sociales,
                    'metodosPago' => $local->metodos_pago ?? ['efectivo', 'tarjeta_entrega', 'transferencia'],
                    'delivery'    => [
                        'fee'        => (float) $local->delivery_fee,
                        'minMinutos' => $local->delivery_min_minutos,
                        'radioKm'    => (int) ($local->delivery_radio_km ?? 5),
                        'zona'       => $local->zona_entrega,
                    ],
                ],
                'branding'   => [
                    'logo'             => $local->logo_url,
                    'banner'           => $local->banner_url,
                    'colorPrimario'    => $local->color_primario,
                    'colorSecundario'  => $local->color_secundario,
                    'colorFondo'       => $local->color_fondo,
                    'tipografia'       => $local->tipografia,
                    'darkMode'         => $local->dark_mode,
                ],
                'categorias' => $local->categorias->map(fn ($c) => [
                    'id'    => $c->id,
                    'slug'  => $c->slug,
                    'nombre'=> $c->nombre,
                    'icono' => $c->icono,
                    'orden' => $c->orden,
                ]),
                'productos'  => $local->productos->map(fn ($p) => [
                    'id'              => $p->id,
                    'slug'            => $p->slug,
                    'nombre'          => $p->nombre,
                    'descripcion'     => $p->descripcion,
                    'precio'          => (float) $p->precio,
                    'precioDescuento' => $p->precio_descuento !== null
                        ? (float) $p->precio_descuento : null,
                    'imagen'          => $p->imagen_url,
                    'disponible'      => $p->disponible,
                    'esCombo'         => $p->es_combo,
                    'esPromocion'     => $p->es_promocion,
                    'tag'             => $p->tag,
                    'extras'          => $p->extras ?? [],
                    'categoria'       => [
                        'id'   => $p->categoria?->id,
                        'slug' => $p->categoria?->slug,
                    ],
                ]),
            ],
        ]);
    }
}
