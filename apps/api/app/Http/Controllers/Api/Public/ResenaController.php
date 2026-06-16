<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Models\Pedido;
use App\Models\Producto;
use App\Models\Resena;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Reseñas públicas. Solo se puede reseñar un producto que aparezca en un
 * pedido del cliente — se identifica por `codigo` del pedido (CE-XXXXXX).
 * No requiere auth.
 */
class ResenaController extends Controller
{
    /** POST /public/resenas/{pedido_codigo} */
    public function store(Request $req, string $pedidoCodigo): JsonResponse
    {
        $data = $req->validate([
            'producto_id'    => ['required', 'integer'],
            'calificacion'   => ['required', 'integer', 'between:1,5'],
            'comentario'     => ['nullable', 'string', 'max:500'],
            'nombre_cliente' => ['nullable', 'string', 'max:120'],
            'image'          => ['nullable', 'image', 'max:5120'], // 5MB
        ]);

        $pedido = Pedido::withoutGlobalScopes()
            ->where('codigo', strtoupper(trim($pedidoCodigo)))
            ->with('detalles:id,pedido_id,producto_id')
            ->first();

        if (! $pedido) {
            return response()->json(['message' => 'Pedido no encontrado.'], 404);
        }

        // El producto debe haber estado en el pedido
        $ids = $pedido->detalles->pluck('producto_id')->all();
        if (! in_array((int) $data['producto_id'], $ids, true)) {
            return response()->json([
                'message' => 'Este producto no estaba en el pedido indicado.',
            ], 422);
        }

        // Evitar duplicados (1 reseña por producto por pedido)
        $dup = Resena::withoutGlobalScopes()
            ->where('pedido_id', $pedido->id)
            ->where('producto_id', $data['producto_id'])
            ->exists();
        if ($dup) {
            return response()->json(['message' => 'Ya reseñaste este producto.'], 409);
        }

        $imageUrl = null;
        if ($req->hasFile('image')) {
            try {
                $result = app(\App\Services\Images\ImageUploader::class)->upload($req->file('image'), 'resenas');
                $imageUrl = $result['url'] ?? null;
            } catch (\Throwable $e) {
                report($e); // no rompe la reseña por fallo de upload
            }
        }

        $resena = Resena::create([
            'local_id'       => $pedido->local_id,
            'producto_id'    => $data['producto_id'],
            'pedido_id'      => $pedido->id,
            'calificacion'   => (int) $data['calificacion'],
            'comentario'     => $data['comentario'] ?? null,
            'image_url'      => $imageUrl,
            'nombre_cliente' => $data['nombre_cliente'] ?? $pedido->cliente_nombre,
            'publicada'      => true,
        ]);

        return response()->json(['data' => $resena], 201);
    }

    /** GET /public/resenas/{slug}/{producto_id} — lista pública para mostrar en landing */
    public function porProducto(string $slug, int $productoId): JsonResponse
    {
        $local = Local::where('slug', $slug)->where('activo', true)->first();
        if (! $local) return response()->json(['message' => 'Local no encontrado'], 404);

        $resenas = Resena::withoutGlobalScopes()
            ->where('local_id', $local->id)
            ->where('producto_id', $productoId)
            ->where('publicada', true)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['calificacion', 'comentario', 'image_url', 'nombre_cliente', 'created_at']);

        $avg   = $resenas->avg('calificacion') ?? 0;
        return response()->json([
            'avg'   => round((float) $avg, 1),
            'count' => $resenas->count(),
            'data'  => $resenas,
        ]);
    }
}
