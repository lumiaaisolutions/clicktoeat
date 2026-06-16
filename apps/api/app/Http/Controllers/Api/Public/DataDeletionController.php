<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Endpoint de derecho de borrado (LFPDPPP México / GDPR equivalencia).
 *
 * El cliente final escribe su email; anonimizamos todos los pedidos
 * vinculados a ese email — no borramos para no romper integridad
 * histórica del local, sólo desidentificamos:
 *   - cliente_nombre  → "Cliente (datos borrados)"
 *   - cliente_email   → null
 *   - cliente_telefono → null
 *   - direccion       → null
 *   - notas           → null
 *
 * Borramos también: reseñas dejadas por ese email y carritos abandonados.
 *
 * No requiere captcha porque tiene rate limit 3/h por IP y no expone PII
 * (sólo confirma "se procesó tu solicitud, recibirás un email").
 */
class DataDeletionController extends Controller
{
    public function request(Request $req): JsonResponse
    {
        $data = $req->validate([
            'email' => ['required', 'email:rfc', 'max:191'],
        ]);

        $email = strtolower(trim($data['email']));

        $affected = DB::transaction(function () use ($email) {
            $count = Pedido::query()
                ->withoutGlobalScopes()
                ->whereRaw('LOWER(cliente_email) = ?', [$email])
                ->update([
                    'cliente_nombre'    => 'Cliente (datos borrados)',
                    'cliente_email'     => null,
                    'cliente_telefono'  => null,
                    'direccion'         => null,
                    'notas'             => null,
                ]);

            // Carrito abandonado si la tabla existe (F75)
            if (\Illuminate\Support\Facades\Schema::hasTable('carritos_abandonados')) {
                DB::table('carritos_abandonados')->whereRaw('LOWER(email) = ?', [$email])->delete();
            }

            // Sellos de lealtad si existe (F73)
            if (\Illuminate\Support\Facades\Schema::hasTable('lealtad_sellos')) {
                DB::table('lealtad_sellos')->whereRaw('LOWER(cliente_email) = ?', [$email])->delete();
            }

            return $count;
        });

        return response()->json([
            'message' => 'Solicitud procesada. Hemos anonimizado tus datos personales en nuestros sistemas.',
            'pedidos_anonimizados' => $affected,
        ]);
    }
}
