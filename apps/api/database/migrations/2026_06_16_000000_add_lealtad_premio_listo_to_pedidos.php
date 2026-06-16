<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            if (! Schema::hasColumn('pedidos', 'lealtad_premio_listo')) {
                $t->boolean('lealtad_premio_listo')->default(false)->after('cliente_telefono');
            }
        });
    }
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            if (Schema::hasColumn('pedidos', 'lealtad_premio_listo')) {
                $t->dropColumn('lealtad_premio_listo');
            }
        });
    }
};
