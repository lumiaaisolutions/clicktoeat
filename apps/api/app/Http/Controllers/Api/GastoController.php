<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Gastos\StoreGastoRequest;
use App\Http\Requests\Gastos\UpdateGastoRequest;
use App\Http\Requests\Gastos\UploadComprobanteRequest;
use App\Models\Gasto;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Gastos operativos del local — control de OPEX (luz, agua, gas, renta, etc.).
 * Distinto de `compras` (inventario de insumos para producir pedidos).
 */
class GastoController extends Controller
{
    public function index(Request $req): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Gasto::class);

        $q = Gasto::query()->orderByDesc('fecha')->orderByDesc('id');

        if ($req->filled('categoria')) {
            $q->where('categoria', $req->string('categoria'));
        }
        if ($req->filled('desde')) {
            $q->whereDate('fecha', '>=', $req->date('desde'));
        }
        if ($req->filled('hasta')) {
            $q->whereDate('fecha', '<=', $req->date('hasta'));
        }
        if ($req->filled('mes')) {
            // mes en formato YYYY-MM
            $mes = $req->string('mes');
            $q->where('fecha', '>=', $mes.'-01')
              ->where('fecha', '<=', Carbon::parse($mes.'-01')->endOfMonth()->toDateString());
        }

        return JsonResource::collection($q->paginate(50));
    }

    public function store(StoreGastoRequest $req): JsonResponse
    {
        // authorize lo hace el FormRequest
        $data = $req->validated();

        $gasto = Gasto::create([
            'categoria'          => $data['categoria'],
            'concepto'           => $data['concepto'],
            'monto_centavos'     => (int) round($data['monto_mxn'] * 100),
            'fecha'              => $data['fecha'],
            'recurrente'         => $data['recurrente'] ?? false,
            'notas'              => $data['notas'] ?? null,
            'comprobante_url'    => $data['comprobante_url'] ?? null,
            'created_by_user_id' => $req->user()->id,
        ]);

        return response()->json(['data' => $gasto], 201);
    }

    public function show(Gasto $gasto): JsonResponse
    {
        $this->authorize('view', $gasto);
        return response()->json(['data' => $gasto]);
    }

    public function update(UpdateGastoRequest $req, Gasto $gasto): JsonResponse
    {
        // authorize lo hace el FormRequest
        $data = $req->validated();

        if (isset($data['monto_mxn'])) {
            $data['monto_centavos'] = (int) round($data['monto_mxn'] * 100);
            unset($data['monto_mxn']);
        }

        $gasto->update($data);
        return response()->json(['data' => $gasto->fresh()]);
    }

    public function destroy(Gasto $gasto): JsonResponse
    {
        $this->authorize('delete', $gasto);
        $gasto->delete();
        return response()->json(null, 204);
    }

    /**
     * Exporta los gastos filtrados a CSV (UTF-8 BOM para que Excel los
     * abra con acentos OK). Same filters que `index`.
     */
    public function exportCsv(Request $req): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $this->authorize('viewAny', Gasto::class);

        $q = Gasto::query()->orderByDesc('fecha')->orderByDesc('id');

        if ($req->filled('categoria')) {
            $q->where('categoria', $req->string('categoria'));
        }
        if ($req->filled('mes')) {
            $mes = $req->string('mes');
            $q->where('fecha', '>=', $mes.'-01')
              ->where('fecha', '<=', Carbon::parse($mes.'-01')->endOfMonth()->toDateString());
        }
        if ($req->filled('desde')) {
            $q->whereDate('fecha', '>=', $req->date('desde'));
        }
        if ($req->filled('hasta')) {
            $q->whereDate('fecha', '<=', $req->date('hasta'));
        }

        $mes = $req->string('mes')->toString() ?: now()->format('Y-m');
        $filename = 'gastos-'.$mes.'.csv';

        return response()->streamDownload(function () use ($q) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM para Excel
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Fecha', 'Categoría', 'Concepto', 'Monto MXN', 'Recurrente', 'Notas', 'Comprobante']);

            $q->chunk(500, function ($rows) use ($out) {
                foreach ($rows as $g) {
                    fputcsv($out, [
                        $g->fecha->format('Y-m-d'),
                        $g->categoria,
                        $g->concepto,
                        number_format($g->monto_centavos / 100, 2, '.', ''),
                        $g->recurrente ? 'sí' : 'no',
                        $g->notas ?? '',
                        $g->comprobante_url ?? '',
                    ]);
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Sube (o reemplaza) el comprobante de un gasto. Acepta imagen o PDF.
     */
    public function subirComprobante(UploadComprobanteRequest $req, Gasto $gasto): JsonResponse
    {
        $disk = Storage::disk('public');

        // Borra el anterior si existía (idempotente por reemplazo).
        if ($gasto->comprobante_url) {
            $rel = $this->extractRelative($gasto->comprobante_url);
            if ($rel) {
                $disk->delete($rel);
            }
        }

        $file = $req->file('comprobante');
        $ext  = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        $name = 'gasto-'.$gasto->id.'-'.Str::lower(Str::random(8)).'.'.$ext;
        $path = $file->storeAs('uploads/comprobantes', $name, 'public');

        $gasto->update(['comprobante_url' => $disk->url($path)]);

        return response()->json(['data' => $gasto->fresh()]);
    }

    /**
     * Borra el comprobante adjunto (deja el gasto, pero limpia el archivo).
     */
    public function eliminarComprobante(Gasto $gasto): JsonResponse
    {
        $this->authorize('update', $gasto);

        if ($gasto->comprobante_url) {
            $rel = $this->extractRelative($gasto->comprobante_url);
            if ($rel) {
                Storage::disk('public')->delete($rel);
            }
            $gasto->update(['comprobante_url' => null]);
        }

        return response()->json(null, 204);
    }

    /**
     * De una URL pública (`https://.../storage/uploads/comprobantes/x.png`)
     * extrae el path relativo al disk `public` (`uploads/comprobantes/x.png`).
     * Tolerante a cambios de host (sólo busca a partir de "/storage/").
     */
    private function extractRelative(string $url): ?string
    {
        $marker = '/storage/';
        $pos = strpos($url, $marker);
        return $pos === false ? null : substr($url, $pos + strlen($marker));
    }

    /**
     * Resumen del mes actual (o el que se pase via ?mes=YYYY-MM):
     *  - total del mes
     *  - desglose por categoría
     *  - comparación con mes anterior (delta %)
     */
    public function resumen(Request $req): JsonResponse
    {
        $this->authorize('viewAny', Gasto::class);

        $mes = $req->filled('mes')
            ? Carbon::parse($req->string('mes').'-01')
            : now()->startOfMonth();

        $start    = $mes->copy()->startOfMonth()->toDateString();
        $end      = $mes->copy()->endOfMonth()->toDateString();
        $prevStart= $mes->copy()->subMonth()->startOfMonth()->toDateString();
        $prevEnd  = $mes->copy()->subMonth()->endOfMonth()->toDateString();

        $total = (int) Gasto::query()
            ->whereBetween('fecha', [$start, $end])
            ->sum('monto_centavos');

        $totalPrev = (int) Gasto::query()
            ->whereBetween('fecha', [$prevStart, $prevEnd])
            ->sum('monto_centavos');

        $deltaPct = $totalPrev > 0
            ? round((($total - $totalPrev) / $totalPrev) * 100, 1)
            : null;

        $porCategoria = Gasto::query()
            ->whereBetween('fecha', [$start, $end])
            ->select('categoria', DB::raw('SUM(monto_centavos) as total_centavos'), DB::raw('COUNT(*) as cantidad'))
            ->groupBy('categoria')
            ->orderByDesc('total_centavos')
            ->get();

        return response()->json([
            'data' => [
                'mes'           => $mes->format('Y-m'),
                'total_mxn'     => round($total / 100, 2),
                'total_centavos'=> $total,
                'total_prev_mxn'=> round($totalPrev / 100, 2),
                'delta_pct'     => $deltaPct,
                'por_categoria' => $porCategoria->map(fn ($r) => [
                    'categoria'      => $r->categoria,
                    'total_mxn'      => round($r->total_centavos / 100, 2),
                    'total_centavos' => (int) $r->total_centavos,
                    'cantidad'       => (int) $r->cantidad,
                ]),
            ],
        ]);
    }
}
