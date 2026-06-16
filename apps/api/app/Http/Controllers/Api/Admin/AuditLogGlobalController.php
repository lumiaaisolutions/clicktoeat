<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogGlobalController extends Controller
{
    public function index(Request $req): JsonResponse
    {
        $q = AuditLog::query()
            ->with('actor:id,nombre,rol,email')
            ->orderByDesc('id');

        if ($s = $req->input('q')) {
            $q->where(function ($w) use ($s) {
                $w->where('action', 'like', "%$s%")
                  ->orWhere('subject_type', 'like', "%$s%");
            });
        }

        if ($localId = $req->input('local_id')) {
            $q->where('local_id', (int) $localId);
        }

        $perPage = min((int) $req->input('per_page', 50), 200);
        $logs = $q->paginate($perPage);

        return response()->json($logs);
    }
}
