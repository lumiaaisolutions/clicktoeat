<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabla para garantizar que requests no-idempotentes (POST de pedidos públicos)
 * NO se procesen dos veces cuando el cliente reintenta por timeout / pérdida de
 * red. El cliente manda `Idempotency-Key: <uuid>` en el header; el middleware
 * Idempotency busca por key + endpoint + request_hash:
 *   - Si match exacto → devuelve la respuesta cacheada (mismo status + body).
 *   - Si key existe pero hash distinto → 409 (cliente está reusando key con body diferente).
 *   - Si no existe → procesa normal y cachea la respuesta.
 *
 * TTL: 24h. Cleanup por cron (cuando se introduzca en Console/Kernel).
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->index();               // UUID del cliente
            $table->string('endpoint', 100);                   // p.ej. POST:/public/pedidos/{slug}
            $table->string('request_hash', 64);                // sha256 del body normalizado
            $table->unsignedSmallInteger('status_code');       // status de la respuesta cacheada
            $table->longText('response_body');                  // JSON serializado de la respuesta
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at')->index();          // típicamente +24h

            $table->unique(['key', 'endpoint']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
