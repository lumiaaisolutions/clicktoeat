<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Local;
use App\Services\Loyalty\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function status(Request $req, string $slug): JsonResponse
    {
        $email = $req->validate(['email' => ['required', 'email:rfc', 'max:191']])['email'];

        $local = Local::where('slug', $slug)->where('activo', true)->firstOrFail();
        if (! $local->lealtad_activo) {
            return response()->json(['enabled' => false]);
        }

        $status = app(LoyaltyService::class)->statusPara($local, $email);
        return response()->json([
            'enabled' => true,
            ...$status,
        ]);
    }
}
