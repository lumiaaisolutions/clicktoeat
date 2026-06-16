<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\TicketReplyMail;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\Notifications\WebPushSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

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

        // Notifica al owner: email + push (best-effort, no rompe si falla)
        $ticket->load('user');
        if ($ticket->user?->email) {
            try { Mail::to($ticket->user->email)->send(new TicketReplyMail($ticket, $data['mensaje'])); }
            catch (\Throwable $e) { report($e); }
        }
        if ($ticket->user_id) {
            app(WebPushSender::class)->sendToUser($ticket->user_id, [
                'title' => "Respuesta a tu ticket #{$ticket->id}",
                'body'  => mb_strimwidth($data['mensaje'], 0, 120, '…'),
                'url'   => '/admin/ayuda/contactar',
                'tag'   => "ticket-{$ticket->id}",
            ]);
        }

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

        // Notifica a super admins por push (no email — el super entra al panel)
        app(WebPushSender::class)->sendToSuperAdmins([
            'title' => "Nuevo ticket: {$ticket->asunto}",
            'body'  => ($req->user()->nombre ?? 'Owner').' · '.($data['categoria'] ?? 'soporte'),
            'url'   => '/admin/tickets',
            'tag'   => "ticket-new-{$ticket->id}",
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
