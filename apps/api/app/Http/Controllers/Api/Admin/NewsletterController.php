<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsletterBlast;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

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
        $query = User::query()->whereNotNull('email');
        if ($rol !== 'todos') $query->where('rol', $rol);
        $recipients = $query->select('id', 'nombre', 'email')->get();

        $blast = NewsletterBlast::create([
            'user_id'          => $req->user()->id,
            'asunto'           => $data['asunto'],
            'body'             => $data['body'],
            'recipients_count' => $recipients->count(),
            'started_at'       => now(),
        ]);

        $sent = 0; $failed = 0;
        foreach ($recipients as $u) {
            try {
                Mail::raw($data['body'], function ($m) use ($u, $data) {
                    $m->to($u->email)->subject($data['asunto']);
                });
                $sent++;
            } catch (\Throwable $e) {
                Log::warning('newsletter send failed', ['user' => $u->id, 'error' => $e->getMessage()]);
                $failed++;
            }
        }

        $blast->update([
            'sent_count'   => $sent,
            'failed_count' => $failed,
            'finished_at'  => now(),
        ]);

        return response()->json(['data' => $blast->fresh()], 201);
    }
}
