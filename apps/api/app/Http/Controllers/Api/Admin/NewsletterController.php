<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendNewsletterBlast;
use App\Models\NewsletterBlast;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => NewsletterBlast::with('user:id,nombre,email')->orderByDesc('id')->limit(50)->get(),
        ]);
    }

    public function send(Request $req): JsonResponse
    {
        $data = $req->validate([
            'asunto' => ['required', 'string', 'max:200'],
            'body'   => ['required', 'string', 'max:10000'],
            'rol'    => ['sometimes', 'in:owner,super_admin,todos'],
        ]);

        $rol = $data['rol'] ?? 'owner';
        $count = User::query()->whereNotNull('email')
            ->when($rol !== 'todos', fn ($q) => $q->where('rol', $rol))
            ->count();

        $blast = NewsletterBlast::create([
            'user_id'          => $req->user()->id,
            'asunto'           => $data['asunto'],
            'body'             => $data['body'],
            'recipients_count' => $count,
            'started_at'       => now(),
        ]);

        // Dispatch al Job: corre sync con QUEUE_CONNECTION=sync (default actual),
        // o se encola si después activan queue:database + cron `queue:work --once`.
        SendNewsletterBlast::dispatch($blast->id, $rol);

        return response()->json(['data' => $blast->fresh()], 201);
    }
}
