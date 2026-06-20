<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OutgoingWebhook;
use App\Rules\SafePublicUrl;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * CRUD para webhooks de salida configurados por el local. Sólo plan Premium
 * (gated por feature API_WEBHOOKS). Ver F90.
 */
class OutgoingWebhookController extends Controller
{
    public function index(TenantContext $tenant): JsonResponse
    {
        return response()->json([
            'data' => OutgoingWebhook::where('local_id', $tenant->localIdOrFail())
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function store(Request $req, TenantContext $tenant): JsonResponse
    {
        $data = $req->validate([
            'event'  => ['required', 'in:pedido.creado'],
            // SEV-3 — Defensa anti-SSRF: el validador `url` de Laravel sólo
            // chequea sintaxis. SafePublicUrl resuelve el host y rechaza
            // IPs privadas / loopback / link-local / metadata cloud.
            'url'    => ['required', 'url', 'max:500', new SafePublicUrl(allowHttp: ! app()->isProduction())],
            'active' => ['sometimes', 'boolean'],
        ]);

        $hook = OutgoingWebhook::create([
            'local_id'   => $tenant->localIdOrFail(),
            'event'      => $data['event'],
            'url'        => $data['url'],
            'secret'     => Str::random(40),
            'active'     => $data['active'] ?? true,
        ]);

        return response()->json(['data' => $hook], 201);
    }

    public function update(Request $req, TenantContext $tenant, OutgoingWebhook $webhook): JsonResponse
    {
        abort_unless($webhook->local_id === $tenant->localIdOrFail(), 404);

        $data = $req->validate([
            'url'    => ['sometimes', 'url', 'max:500', new SafePublicUrl(allowHttp: ! app()->isProduction())],
            'active' => ['sometimes', 'boolean'],
        ]);
        $webhook->update($data);
        return response()->json(['data' => $webhook->fresh()]);
    }

    public function destroy(TenantContext $tenant, OutgoingWebhook $webhook): JsonResponse
    {
        abort_unless($webhook->local_id === $tenant->localIdOrFail(), 404);
        $webhook->delete();
        return response()->json(null, 204);
    }
}
