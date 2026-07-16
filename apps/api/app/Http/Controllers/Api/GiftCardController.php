<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GiftCard;
use App\Models\Local;
use App\Services\Salon\GiftCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

class GiftCardController extends Controller
{
    public function __construct(protected GiftCardService $giftCards) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', GiftCard::class);

        return JsonResource::collection(GiftCard::query()->orderByDesc('created_at')->get());
    }

    public function store(Request $req): JsonResponse
    {
        $this->authorize('create', GiftCard::class);
        $data = $req->validate([
            'monto' => ['required', 'numeric', 'min:1'],
            'comprador_email' => ['nullable', 'email'],
        ]);

        $local = Local::withoutGlobalScopes()->findOrFail($req->user()->local_id);
        $giftCard = $this->giftCards->emitir($local, (float) $data['monto'], $data['comprador_email'] ?? null);

        return response()->json(['data' => $giftCard], 201);
    }
}
