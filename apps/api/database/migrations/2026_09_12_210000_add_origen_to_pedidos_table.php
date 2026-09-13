<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Origen del pedido: 'landing' (cliente desde su URL pública) vs 'pos'
 * (mostrador/panel). Lo usamos para enviar correos de seguimiento SOLO a
 * pedidos del landing (los del POS suelen no tener correo del cliente).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pedidos', 'origen')) {
            Schema::table('pedidos', function (Blueprint $t) {
                $t->string('origen', 20)->default('landing')->after('estado');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pedidos', 'origen')) {
            Schema::table('pedidos', function (Blueprint $t) {
                $t->dropColumn('origen');
            });
        }
    }
};
