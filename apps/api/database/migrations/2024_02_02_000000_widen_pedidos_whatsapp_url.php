<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El mensaje pre-armado de WhatsApp puede superar fácilmente los 500 chars
 * cuando hay varios items, extras o notas. La string codificada con
 * rawurlencode (espacios → %20, acentos → %C3%xx) duplica o triplica el
 * tamaño visible. Pasamos la columna a TEXT para evitar el truncado.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->text('whatsapp_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('whatsapp_url', 500)->nullable()->change();
        });
    }
};
