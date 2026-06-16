<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketsController extends Controller
{
    public function index(Request $req): JsonResponse
    {
        $q = SupportTicket::query()
            ->with(['local:id,nombre,slug', 'user:id,nombre,email', 'messages'])
            ->orderByDesc('id');
        if ($e = $req->input('estado')) $q->where('estado', $e);
        $perPage = min((int) $req->input('per_page', 30), 100);
        return response()->json($q->paginate($perPage));
    }

    public function responder(Request $req, SupportTicket $ticket): JsonResponse
    {
        $data = $req->validate(['mensaje' => ['required', 'string', 'max:5000']]);
        SupportMessage::create([
            'ticket_id'  => $ticket->id,
            'user_id'    => $req->user()->id,
            'mensaje'    => $data['mensaje'],
            'from_super' => true,
            'created_at' => now(),
        ]);
        $ticket->update(['estado' => 'respondido']);
        return response()->json(['data' => $ticket->fresh('messages')]);
    }

    public function cerrar(SupportTicket $ticket): JsonResponse
    {
        $ticket->update(['estado' => 'cerrado', 'cerrado_at' => now()]);
        return response()->json(['data' => $ticket->fresh()]);
    }

    /* ─────────────── Owner-side endpoints ─────────────── */

    public function listForOwner(Request $req): JsonResponse
    {
        $items = SupportTicket::query()
            ->where('user_id', $req->user()->id)
            ->with(['messages'])
            ->orderByDesc('id')
            ->get();
        return response()->json(['data' => $items]);
    }

    public function storeForOwner(Request $req): JsonResponse
    {
        $data = $req->validate([
            'asunto'    => ['required', 'string', 'max:200'],
            'mensaje'   => ['required', 'string', 'max:5000'],
            'categoria' => ['nullable', 'string', 'max:40'],
            'prioridad' => ['nullable', 'string', 'max:20'],
        ]);

        $ticket = SupportTicket::create([
            'local_id'  => $req->user()->local_id,
            'user_id'   => $req->user()->id,
            'asunto'    => $data['asunto'],
            'categoria' => $data['categoria'] ?? 'otro',
            'prioridad' => $data['prioridad'] ?? 'normal',
            'estado'    => 'abierto',
        ]);
        SupportMessage::create([
            'ticket_id'  => $ticket->id,
            'user_id'    => $req->user()->id,
            'mensaje'    => $data['mensaje'],
            'from_super' => false,
        ]);

        return response()->json(['data' => $ticket->fresh('messages')], 201);
    }

    public function replyAsOwner(Request $req, SupportTicket $ticket): JsonResponse
    {
        if ($ticket->user_id !== $req->user()->id) {
            abort(403, 'No es tu ticket.');
        }
        $data = $req->validate(['mensaje' => ['required', 'string', 'max:5000']]);
        SupportMessage::create([
            'ticket_id'  => $ticket->id,
            'user_id'    => $req->user()->id,
            'mensaje'    => $data['mensaje'],
            'from_super' => false,
        ]);
        if ($ticket->estado === 'respondido' || $ticket->estado === 'cerrado') {
            $ticket->update(['estado' => 'abierto']);
        }
        return response()->json(['data' => $ticket->fresh('messages')]);
    }
}
