<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            if (! Schema::hasColumn('pedidos', 'cliente_email')) {
                $t->string('cliente_email', 191)->nullable()->after('cliente_nombre');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $t) {
            if (Schema::hasColumn('pedidos', 'cliente_email')) $t->dropColumn('cliente_email');
        });
    }
};
