<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD de plantillas de email. El super_admin puede editar el subject y el
 * body_html de los correos transaccionales sin tocar código. Cada Mailable
 * consulta `EmailTemplate::findBySlug($slug)` con fallback al template Blade
 * original si no hay registro activo.
 *
 * Slugs reservados: pedido_confirmado, trial_will_end, trial_nudge,
 * payment_failed, plan_canceled, welcome, carrito_abandonado, resumen_semanal,
 * ticket_reply.
 */
class EmailTemplatesController extends Controller
{
    public function index(): JsonResponse
    {
        $items = EmailTemplate::orderBy('slug')->get();
        return response()->json(['data' => $items]);
    }

    public function store(Request $req): JsonResponse
    {
        $data = $req->validate([
            'slug'      => ['required', 'string', 'max:60', 'unique:email_templates,slug'],
            'subject'   => ['required', 'string', 'max:200'],
            'body_html' => ['required', 'string'],
            'active'    => ['boolean'],
        ]);
        $t = EmailTemplate::create($data);
        return response()->json(['data' => $t], 201);
    }

    public function update(Request $req, EmailTemplate $template): JsonResponse
    {
        $data = $req->validate([
            'subject'   => ['sometimes', 'required', 'string', 'max:200'],
            'body_html' => ['sometimes', 'required', 'string'],
            'active'    => ['sometimes', 'boolean'],
        ]);
        $template->update($data);
        return response()->json(['data' => $template->fresh()]);
    }

    public function destroy(EmailTemplate $template): JsonResponse
    {
        $template->delete();
        return response()->json(null, 204);
    }

    /**
     * Renderiza la plantilla con datos de prueba para preview en el editor.
     * No envía nada — solo devuelve subject+body con placeholders sustituidos.
     */
    public function preview(Request $req): JsonResponse
    {
        $data = $req->validate([
            'subject'   => ['required', 'string'],
            'body_html' => ['required', 'string'],
        ]);

        $sample = [
            'nombre_local'    => 'Tacos El Gordo',
            'nombre_cliente'  => 'María González',
            'pedido_id'       => 1234,
            'total'           => '$245.00',
            'link'            => 'https://clicktoeat.lumiaaisolutions.com/tacos-el-gordo',
            'fecha'           => now()->format('d/m/Y H:i'),
            'codigo'          => 'BIENVENIDO10',
        ];
        $sub = $this->fill($data['subject'],   $sample);
        $bdy = $this->fill($data['body_html'], $sample);

        return response()->json([
            'subject_rendered'   => $sub,
            'body_html_rendered' => $bdy,
            'sample_vars'        => $sample,
        ]);
    }

    private function fill(string $tpl, array $vars): string
    {
        foreach ($vars as $k => $v) {
            $tpl = str_replace('{{ '.$k.' }}', (string) $v, $tpl);
            $tpl = str_replace('{{'.$k.'}}',   (string) $v, $tpl);
        }
        return $tpl;
    }
}
