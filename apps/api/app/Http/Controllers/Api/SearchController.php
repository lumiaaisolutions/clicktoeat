<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use App\Models\Producto;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda global rápida para Cmd+K. Por tenant, devuelve hasta 5 hits
 * por tipo: pedidos (código + cliente), productos (nombre), clientes (teléfono o email).
 *
 * SEV-12 nota: usa `$tenant->localIdOrFail()` que lanza 403 si no hay
 * tenant context. Suficiente para este endpoint (search es read-only por
 * tenant). No requiere Policy reutilizable.
 */
class SearchController extends Controller
{
    public function search(Request $req, TenantContext $tenant): JsonResponse
    {
        $q = trim((string) $req->input('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => ['pedidos' => [], 'productos' => [], 'clientes' => []]]);
        }

        $localId = $tenant->localIdOrFail();
        $like    = '%'.$q.'%';

        $pedidos = Pedido::query()
            ->where('local_id', $localId)
            ->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                  ->orWhere('cliente_nombre', 'like', $like)
                  ->orWhere('cliente_telefono', 'like', $like)
                  ->orWhere('cliente_email', 'like', $like);
            })
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'codigo', 'cliente_nombre', 'total', 'estado', 'created_at']);

        $productos = Producto::query()
            ->where('local_id', $localId)
            ->where(function ($w) use ($like) {
                $w->where('nombre', 'like', $like)
                  ->orWhere('slug',   'like', $like);
            })
            ->orderBy('nombre')
            ->limit(5)
            ->get(['id', 'nombre', 'slug', 'precio', 'disponible']);

        // Clientes: agrupados por teléfono/email a partir de pedidos
        $clientes = DB::table('pedidos')
            ->where('local_id', $localId)
            ->where(function ($w) use ($like) {
                $w->where('cliente_nombre', 'like', $like)
                  ->orWhere('cliente_telefono', 'like', $like)
                  ->orWhere('cliente_email', 'like', $like);
            })
            ->select('cliente_nombre', 'cliente_telefono', 'cliente_email', DB::raw('MAX(created_at) as ultimo'), DB::raw('COUNT(*) as pedidos'))
            ->groupBy('cliente_nombre', 'cliente_telefono', 'cliente_email')
            ->orderByDesc('ultimo')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'pedidos'   => $pedidos,
                'productos' => $productos,
                'clientes'  => $clientes,
            ],
        ]);
    }
}
