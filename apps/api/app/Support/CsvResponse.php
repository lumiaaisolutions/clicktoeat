<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Helper para devolver un CSV streaming desde una collection lazy.
 * Evita cargar 10k filas en memoria.
 *
 * Uso:
 *   return CsvResponse::stream('pedidos-2026-06.csv', $headers, function () {
 *       foreach (Pedido::cursor() as $p) {
 *           yield [$p->codigo, $p->cliente_nombre, $p->total];
 *       }
 *   });
 */
class CsvResponse
{
    /**
     * @param string $filename
     * @param list<string> $headers Columnas (primera fila)
     * @param callable():iterable $rows Generator que yieldea arrays escalares
     */
    public static function stream(string $filename, array $headers, callable $rows): StreamedResponse
    {
        return new StreamedResponse(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            // BOM UTF-8 para que Excel abra acentos bien
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers);
            foreach ($rows() as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-store',
        ]);
    }
}
